# Contributing to luci-app-esim

Thanks for your interest in contributing. This document covers the development workflow, code conventions, and how to test changes.

## Project structure

```
luci-app-esim/
├── Makefile                          # OpenWrt package Makefile (LuCI build)
├── Makefile.core                     # OpenWrt package Makefile (core scripts)
├── root/
│   ├── etc/
│   │   ├── config/esim               # Default UCI config
│   │   ├── init.d/esim               # Init/service script
│   │   └── uci-defaults/99-esim      # First-boot setup
│   └── usr/
│       ├── bin/esim-ctrl             # CLI wrapper script
│       ├── libexec/rpcd/luci.esim    # RPCd JSON-RPC backend
│       └── share/
│           ├── luci/menu.d/          # LuCI navigation menu
│           └── rpcd/acl.d/           # Access control list
├── htdocs/luci-static/resources/
│   ├── esim.js                       # Shared RPC utilities
│   └── view/esim/
│       ├── overview.js               # Overview page
│       ├── profiles.js               # Profile list & management
│       ├── download.js               # Profile download
│       ├── modem.js                  # Modem info & AT console
│       ├── settings.js               # UCI settings form
│       └── esim.css                  # Scoped stylesheet
├── po/
│   └── templates/luci-app-esim.pot  # i18n translation template
└── .github/workflows/build.yml      # CI
```

## Development workflow

### Setting up a test router

1. Build or download a snapshot OpenWrt image for your target.
2. Install `lpac`, `socat`, and `kmod-usb-serial-option`.
3. Clone this repo locally.
4. Copy files to the router for rapid iteration:

```sh
# From repo root:
ROUTER=root@192.168.1.1

rsync -avz root/ $ROUTER:/
rsync -avz htdocs/ $ROUTER:/www/

ssh $ROUTER "chmod +x /usr/libexec/rpcd/luci.esim /usr/bin/esim-ctrl /etc/init.d/esim"
ssh $ROUTER "/etc/init.d/rpcd restart && /etc/init.d/uhttpd restart"
```

The LuCI JS views are loaded by the browser on demand — editing `.js` files and refreshing the browser (with cache disabled) is sufficient. No build step needed.

### Testing the RPCd plugin directly

```sh
ssh root@192.168.1.1

# List available methods
echo '{}' | /usr/libexec/rpcd/luci.esim list

# Test get_info
echo '{}' | /usr/libexec/rpcd/luci.esim get_info

# Test enable_profile
echo '{"iccid":"89012604505198982741"}' | /usr/libexec/rpcd/luci.esim enable_profile
```

### Testing via ubus

```sh
ubus call luci.esim get_info
ubus call luci.esim list_profiles
ubus call luci.esim enable_profile '{"iccid":"89012604505198982741"}'
```

## Code conventions

### Shell (`root/usr/libexec/rpcd/luci.esim`, `root/usr/bin/esim-ctrl`)

- POSIX sh only — no bash-isms. Target is busybox ash on OpenWrt.
- All public functions named `method_*` in the RPCd plugin, `cmd_*` in the CLI.
- Every lpac call goes through `_lpac()` wrapper for logging.
- JSON output: always `_json_ok <payload>` or `_json_err <code> <message>`. Never raw `echo`.
- `shellcheck -x` must pass with no errors.

### JavaScript (`htdocs/luci-static/resources/view/esim/*.js`)

- LuCI next-gen view API — extend `view` with a `load()` + `render()` pair.
- DOM via `E()` helpers only — no `innerHTML` in views (only allowed in `esim.js` shared utilities).
- RPC calls only through `esim.*` wrapper methods.
- `handleSaveApply`, `handleSave`, `handleReset` set to `null` on views that don't use the built-in save bar.
- All user-visible strings wrapped in `_()` for i18n.

### CSS

- All selectors prefixed `.esim-*` — no bleed into LuCI base styles.
- Color values via CSS custom properties (`var(--color-*)`) where possible for theme compatibility.
- Responsive breakpoint at 600px.

## Adding a translation

1. Copy the template:

```sh
cp po/templates/luci-app-esim.pot po/de/luci-app-esim.po
```

2. Fill in `msgstr` entries in the new `.po` file.

3. Submit a pull request. Translations are compiled into the package during the OpenWrt build.

## Adding support for a new modem

1. Test that `lpac` works with the modem (see lpac docs).
2. Determine the correct `at_device` path (usually `/dev/ttyUSBx` — check `dmesg` after plugging in).
3. If the modem uses vendor-specific AT commands for signal metrics (e.g. `AT+QCSQ` for Quectel), add parsing in the `method_get_modem_info` section of `root/usr/libexec/rpcd/luci.esim`.
4. Add the modem to the supported hardware table in `README.md`.
5. Open a PR with test results.

## Submitting a pull request

- Target the `main` branch for bug fixes, `dev` for new features.
- Include a brief description of what changed and why.
- Make sure ShellCheck passes: `shellcheck -x root/usr/libexec/rpcd/luci.esim root/usr/bin/esim-ctrl`
- If adding a new RPCd method, update the ACL JSON, the `.pot` template, and the README API table.

## Reporting issues

Please include:
- OpenWrt version and target
- Modem model and firmware version
- `lpac --version` output
- Relevant lines from `/var/log/esim.log`
- Steps to reproduce
