include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-esim
PKG_VERSION:=1.4.2
PKG_RELEASE:=2

PKG_MAINTAINER:=luci-app-esim contributors
PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=LuCI eSIM Manager
LUCI_DESCRIPTION:=Web interface for managing eSIM profiles on eUICC-capable modems \
	using lpac (Local Profile Assistant Client). Supports profile download via \
	SM-DP+ activation codes, profile switching, AT console, and modem diagnostics.
LUCI_DEPENDS:=+lpac +kmod-usb-serial +kmod-usb-serial-option +socat

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot standard
$(eval $(call BuildPackage,luci-app-esim))
