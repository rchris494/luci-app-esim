# Changelog

All notable changes to `luci-app-esim` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.4.2] - 2024-03-01

### Added
- `esim-ctrl status` command showing combined modem + profile state
- AT console in Modem view with Tab-completion for allowed commands
- Log rotation in init script (rotates at 512 KB)
- `send_at` RPCd method with strict allowlist (read-only AT commands only)
- SINR field in modem radio card
- `IMEI` passthrough in download_profile for carrier binding

### Changed
- `enable_profile` now triggers `ifdown`/`ifup` on the configured WAN interface automatically
- Progress steps in the Download view now match actual ES9+ handshake phases
- RPCd ACL split into `read` and `write` grants for finer-grained access control

### Fixed
- Race condition where `rpcd` could return stale profile list after enable/disable
- `socat` AT command exchange now uses `-t` timeout to prevent hangs on absent device
- UCI defaults script no longer overwrites existing `esim` config on sysupgrade

## [1.4.1] - 2024-01-15

### Added
- Settings view backed by LuCI `form.Map` / UCI
- `remove_notifications` option — clear RSP queue after successful send
- `test_certificates` option — allow GSMA CI test root for development

### Changed
- Moved CSS into scoped `esim.css` — no longer inlined in views
- `list_profiles` returns full lpac JSON including `profile_class` and `provider_name`

### Fixed
- Download view tab switch now correctly hides/shows panes after first render
- `esim-ctrl delete` now prompts for confirmation before invoking lpac

## [1.4.0] - 2023-11-20

### Added
- Initial public release
- LuCI views: Overview, Profiles, Download, Modem, Settings
- `luci.esim` RPCd plugin (shell-based, wraps lpac)
- `esim-ctrl` CLI tool
- UCI configuration schema (`/etc/config/esim`)
- GitHub Actions CI: ShellCheck + OpenWrt SDK build for x86-64 and ramips/mt7621
- i18n template (`po/templates/luci-app-esim.pot`)

[1.4.2]: https://github.com/your-org/luci-app-esim/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/your-org/luci-app-esim/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/your-org/luci-app-esim/releases/tag/v1.4.0
