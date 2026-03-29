'use strict';
// htdocs/luci-static/resources/esim.js
// Shared utilities for luci-app-esim views.
// Provides a thin wrapper around L.rpc calls to luci.esim.

'require rpc';
'require ui';
'require baseclass';

const esimRpc = rpc.declare({
	object: 'luci.esim',
	method: 'get_info',
	params: [],
	expect: { result: {} },
});

// Build a typed RPC caller for every method
function makeCall(method, params, expect) {
	return rpc.declare({
		object: 'luci.esim',
		method: method,
		params: params || [],
		expect: expect || { result: {} },
	});
}

return baseclass.extend({
	// ── Info / overview ──────────────────────────────────────────────────
	getInfo: makeCall('get_info'),

	// ── Profile management ───────────────────────────────────────────────
	listProfiles: makeCall('list_profiles'),

	enableProfile: makeCall('enable_profile', ['iccid']),
	disableProfile: makeCall('disable_profile', ['iccid']),
	deleteProfile: makeCall('delete_profile', ['iccid']),

	// ── Download ─────────────────────────────────────────────────────────
	downloadProfile: makeCall('download_profile',
		['activation_code', 'smdp', 'matching_id', 'confirmation_code', 'imei']),

	// ── Notifications ────────────────────────────────────────────────────
	getNotifications: makeCall('get_notifications'),
	sendNotifications: makeCall('send_notifications'),

	// ── Modem ────────────────────────────────────────────────────────────
	getModemInfo: makeCall('get_modem_info'),
	sendAt: makeCall('send_at', ['cmd']),

	// ── Log ──────────────────────────────────────────────────────────────
	getSystemLog: makeCall('get_system_log', ['lines']),

	// ── Helpers ──────────────────────────────────────────────────────────

	/**
	 * Render an RPC error to the UI banner.
	 * @param {string} ctx  Human-readable context, e.g. "enabling profile"
	 * @param {object} err  The caught error or RPC response
	 */
	showError(ctx, err) {
		const msg = (err && err.message) ? err.message :
			(typeof err === 'string' ? err : 'unknown error');
		ui.addNotification(null,
			E('p', {}, _('Error %s: %s').format(ctx, msg)),
			'danger');
	},

	/**
	 * Format an ICCID for display (group into 4-digit blocks).
	 * @param {string} iccid
	 * @returns {string}
	 */
	formatIccid(iccid) {
		return (iccid || '').replace(/(.{4})/g, '$1 ').trim();
	},

	/**
	 * Map a numeric CSQ value to an RSSI estimate.
	 * @param {string|number} csq
	 * @returns {string}
	 */
	csqToRssi(csq) {
		const val = parseInt(csq, 10);
		if (isNaN(val) || val === 99) return 'unknown';
		return `${-113 + val * 2} dBm`;
	},

	/**
	 * Return a CSS class name for signal quality coloring.
	 * @param {string|number} rsrp  RSRP value in dBm (string with " dBm" or raw int)
	 * @returns {'good'|'fair'|'poor'|'unknown'}
	 */
	signalClass(rsrp) {
		const val = parseInt(rsrp, 10);
		if (isNaN(val)) return 'unknown';
		if (val >= -80) return 'good';
		if (val >= -100) return 'fair';
		return 'poor';
	},

	/**
	 * Parse a LPA activation code string into its components.
	 * Accepts both raw "smdp$matchingid" and "LPA:1$smdp$matchingid" formats.
	 * @param {string} ac
	 * @returns {{ smdp: string, matchingId: string, confirmationCode: string }}
	 */
	parseActivationCode(ac) {
		let raw = (ac || '').trim();
		raw = raw.replace(/^LPA:1\$/, '');
		const parts = raw.split('$');
		return {
			smdp: parts[0] || '',
			matchingId: parts[1] || '',
			confirmationCode: parts[2] || '',
		};
	},
});
