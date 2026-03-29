# luci-app-esim

A LuCI web interface for managing eSIM profiles on OpenWrt routers with eUICC-capable modems. Built on top of [`lpac`](https://github.com/estkme-group/lpac) (Local Profile Assistant Client) and exposed via the `rpcd` JSON-RPC bus.

![Build Status](https://github.com/your-org/luci-app-esim/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![OpenWrt](https://img.shields.io/badge/OpenWrt-23.05%2B-success)

---

## Features

- **Profile management** — list, enable, disable, and delete eSIM profiles stored on the eUICC
- **Profile download** — install new profiles via SM-DP+ activation code (LPA URI or QR scan) or manual server/matching-ID entry
- **Modem diagnostics** — hardware info, radio metrics (RSRP/RSRQ/SINR/temperature), and a sandboxed AT command console
- **RSP notifications** — send pending install/delete events to operator servers per GSMA SGP.22
- **System log** — live tail of the eSIM daemon log from the web UI
- **Settings** — full UCI-backed configuration of the LPA daemon, APDU device, WAN interface, reconnect behaviour, and TLS certificate policy
- **CLI tool** — `esim-ctrl` shell script for scripting and cron-based profile switching

## Supported Hardware

Any modem with an embedded eUICC (eIM) that exposes an APDU/AT interface. Tested with:

| Modem | Interface | Notes |
|---|---|---|
| Sierra Wireless EM9191 | `/dev/ttyUSB0` | 5G SA/NSA, SGP.22 v2.4 |
| Quectel RM520N-GL | `/dev/ttyUSB2` | 5G, AT+QESIM |
| Quectel EC25 | `/dev/ttyUSB2` | LTE only |
| Fibocom FM160 | `/dev/ttyUSB0` | 5G |
| u-blox SARA-R510S | `/dev/ttyACM0` | LTE-M/NB-IoT |

Modems supported by `lpac` will generally work. See the [lpac compatibility list](https://github.com/estkme-group/lpac#supported-modems).

## Requirements

- OpenWrt 23.05 or newer (LuCI next-gen JS views)
- [`lpac`](https://github.com/estkme-group/lpac) — install from the OpenWrt package feed or build from source
- `socat` — for AT command communication
- `kmod-usb-serial-option` — USB modem serial driver
- A modem with eUICC support (SGP.22 v2.2+)

## Installation

### From pre-built .ipk (recommended)

Download the latest `.ipk` from the [Releases](https://github.com/your-org/luci-app-esim/releases) page, copy it to your router, and install:

```sh
opkg update
opkg install kmod-usb-serial-option socat
opkg install lpac        # if available in feeds
opkg install luci-app-esim_*.ipk
```

Reboot or restart rpcd and uhttpd:

```sh
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
```

Then navigate to **Network → eSIM Manager** in LuCI.

### From OpenWrt buildroot

1. Add this repo as a feed in `feeds.conf.default`:

```
src-git esim https://github.com/your-org/luci-app-esim.git
```

2. Update and install:

```sh
./scripts/feeds update esim
./scripts/feeds install luci-app-esim
```

3. Enable in `make menuconfig`:

```
LuCI → Applications → luci-app-esim
```

4. Build as usual with `make`.

### Manual installation (development)

```sh
# On your router:
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/

chmod +x /usr/libexec/rpcd/luci.esim
chmod +x /usr/bin/esim-ctrl
chmod +x /etc/init.d/esim
chmod +x /etc/uci-defaults/99-esim

/etc/uci-defaults/99-esim
/etc/init.d/esim enable
/etc/init.d/esim start
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
```

## Configuration

The package creates `/etc/config/esim` on first boot. Key options:

```
config modem 'modem'
    option at_device    '/dev/ttyUSB0'   # APDU/AT serial device
    option wan_interface 'wwan0'          # WAN interface to restart on switch

config settings 'settings'
    option auto_enable         '1'  # Enable profile immediately after download
    option disable_on_switch   '1'  # Disable current profile before enabling new
    option auto_reconnect      '1'  # Run ifdown/ifup after profile switch
    option reconnect_delay     '5'  # Seconds between ifdown and ifup
    option verify_certs        '1'  # Verify SM-DP+ TLS certificate chain
    option test_certificates   '0'  # Allow GSMA CI test root (dev only)
    option send_notifications  '1'  # POST RSP notifications after operations
    option remove_notifications '1' # Clear notification queue after send
    option log_level           'info'
```

You can also edit these through **Network → eSIM Manager → Settings** in LuCI.

## CLI Usage

The `esim-ctrl` script provides a convenient shell interface:

```sh
# List installed profiles
esim-ctrl list

# Show chip EID and lpac version
esim-ctrl info

# Enable a profile by ICCID (also restarts WAN interface)
esim-ctrl enable 89012604505198982741

# Download via activation code
esim-ctrl download 'LPA:1$smdp.example.com$MATCHING-CODE-12345'

# Download via manual parameters
esim-ctrl download -s smdp.carrier.com -m MATCHINGID123 -c CONFIRMCODE

# Send pending RSP notifications
esim-ctrl notif send

# Send an AT command
esim-ctrl at AT+CGMM

# Tail the eSIM log
esim-ctrl log 100

# Show overall status
esim-ctrl status
```

## Architecture

```
LuCI JS (browser)
    │  JSON-RPC (ubus/rpcd)
    ▼
/usr/libexec/rpcd/luci.esim        ← shell RPCd plugin
    │  subprocess
    ▼
lpac                                ← profile management binary
    │  APDU (AT+CRSM)
    ▼
eUICC (modem)                       ← embedded SIM chip
    │
    ▼
SM-DP+ server                       ← carrier profile server (SGP.22)
```

The LuCI frontend calls `luci.esim` methods over the existing LuCI JSON-RPC bus. The RPCd plugin wraps `lpac` subprocesses and AT command exchange via `socat`. UCI is used for persistent configuration.

## RPCd API

The `luci.esim` rpcd object exposes the following methods. All require the `luci-app-esim` ACL grant.

| Method | Parameters | Description |
|---|---|---|
| `get_info` | — | EID, lpac version, device status |
| `list_profiles` | — | Array of installed profiles |
| `enable_profile` | `iccid` | Enable a profile, optionally restart WAN |
| `disable_profile` | `iccid` | Disable a profile |
| `delete_profile` | `iccid` | Permanently delete from eUICC |
| `download_profile` | `activation_code` \| `smdp`+`matching_id`+`confirmation_code`+`imei` | Download and install a profile |
| `get_notifications` | — | List pending RSP notifications |
| `send_notifications` | — | POST notifications to operator servers |
| `get_modem_info` | — | Hardware, IMEI, signal metrics |
| `send_at` | `cmd` | Send allowlisted AT command |
| `get_system_log` | `lines` | Tail of /var/log/esim.log |

## Security Notes

- The `send_at` method enforces an allowlist of read-only AT commands. Destructive AT commands (e.g. `AT+CFUN`, `ATZ`) are blocked.
- The RPCd ACL (`/usr/share/rpcd/acl.d/luci-app-esim.json`) restricts access to admin users only.
- TLS certificate verification is enabled by default. Disable only for testing.
- Profile deletion requires an explicit confirmation step in the UI.

## Translations

Translation templates are in `po/templates/luci-app-esim.pot`. To add a new language:

```sh
cp po/templates/luci-app-esim.pot po/de/luci-app-esim.po
# Edit msgstr entries in po/de/luci-app-esim.po
# Submit as a pull request
```

Available translations: contributions welcome.

## Development

```sh
# Lint shell scripts
shellcheck root/usr/libexec/rpcd/luci.esim root/usr/bin/esim-ctrl

# Watch JS views (reload after editing)
# Copy htdocs/ to router and refresh browser — no build step needed for JS

# Run RPCd plugin directly for testing
echo '{}' | /usr/libexec/rpcd/luci.esim list
echo '{}' | /usr/libexec/rpcd/luci.esim get_info
```

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Related Projects

- [lpac](https://github.com/estkme-group/lpac) — the underlying LPA CLI tool this package wraps
- [OpenWrt](https://openwrt.org) — the embedded Linux distribution
- [LuCI](https://github.com/openwrt/luci) — the OpenWrt web interface framework
- [eUICC wiki](https://en.wikipedia.org/wiki/SIM_card#Embedded_SIM) — background on eSIM/eUICC technology
