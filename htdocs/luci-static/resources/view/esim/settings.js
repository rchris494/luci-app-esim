'use strict';
// view/esim/settings.js — LPA daemon and modem interface configuration

'require view';
'require form';
'require uci';
'require ui';

return view.extend({
	title: _('eSIM Settings'),

	load() {
		return Promise.all([
			uci.load('esim'),
		]);
	},

	render() {
		const m = new form.Map('esim', _('eSIM Manager Settings'),
			_('Configure the LPA daemon, modem interface, and notification behaviour.'));

		// ── Modem Interface ──────────────────────────────────────────────────
		const sModem = m.section(form.NamedSection, 'modem', 'modem', _('Modem Interface'));
		sModem.anonymous = true;
		sModem.addremove = false;

		let o;

		o = sModem.option(form.Value, 'at_device', _('APDU / AT Device'),
			_('Serial device used for APDU commands (AT+CRSM) and AT queries. ' +
			'Usually /dev/ttyUSB0 or /dev/ttyUSB2 for Quectel/Sierra modems.'));
		o.default = '/dev/ttyUSB0';
		o.placeholder = '/dev/ttyUSB0';
		o.rmempty = false;

		o = sModem.option(form.Value, 'wan_interface', _('WAN Interface'),
			_('Network interface to restart after profile switch. ' +
			'Check /etc/config/network for the correct name.'));
		o.default = 'wwan0';
		o.placeholder = 'wwan0';

		// ── LPA Settings ─────────────────────────────────────────────────────
		const sLpa = m.section(form.NamedSection, 'settings', 'settings', _('LPA Daemon'));
		sLpa.anonymous = true;
		sLpa.addremove = false;

		o = sLpa.option(form.Flag, 'auto_enable', _('Auto-enable on download'),
			_('Immediately enable the new profile after a successful download.'));
		o.default = '1';

		o = sLpa.option(form.Flag, 'disable_on_switch', _('Disable current on switch'),
			_('Deactivate the currently enabled profile before activating a new one. ' +
			'Required by most carriers.'));
		o.default = '1';

		o = sLpa.option(form.Flag, 'auto_reconnect', _('Reconnect WAN after switch'),
			_('Run ifdown/ifup on the WAN interface after enabling a profile.'));
		o.default = '1';

		o = sLpa.option(form.Value, 'reconnect_delay', _('Reconnect delay (seconds)'),
			_('Seconds to wait between ifdown and ifup.'));
		o.default = '5';
		o.datatype = 'uinteger';
		o.placeholder = '5';
		o.rmempty = false;

		o = sLpa.option(form.Flag, 'verify_certs', _('Verify TLS certificates'),
			_('Validate the SM-DP+ server certificate chain against the GSMA CI root.'));
		o.default = '1';

		o = sLpa.option(form.Flag, 'test_certificates', _('Allow GSMA test certificates'),
			_('Accept profiles signed by the GSMA CI test root. ' +
			'Enable only for testing; disable in production.'));
		o.default = '0';

		o = sLpa.option(form.ListValue, 'log_level', _('Log Level'));
		o.value('error', _('Error'));
		o.value('warn',  _('Warning'));
		o.value('info',  _('Info'));
		o.value('debug', _('Debug'));
		o.default = 'info';

		// ── Notifications ─────────────────────────────────────────────────────
		const sNotif = m.section(form.NamedSection, 'settings', 'settings', _('RSP Notifications'));
		sNotif.anonymous = true;
		sNotif.addremove = false;

		o = sNotif.option(form.Flag, 'send_notifications', _('Send profile notifications'),
			_('POST install/delete/enable/disable events to operator RSP servers after profile operations.'));
		o.default = '1';

		o = sNotif.option(form.Flag, 'remove_notifications', _('Remove after send'),
			_('Delete notifications from the local queue after successful delivery.'));
		o.default = '1';

		return m.render();
	},

	handleSaveApply(ev) {
		return this.handleSave(ev).then(() => {
			ui.addNotification(null,
				E('p', {}, _('Settings saved. Restart the eSIM service to apply changes.')),
				'info');
		});
	},
});
