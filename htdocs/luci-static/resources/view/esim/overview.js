'use strict';
// view/esim/overview.js — System overview and connection status

'require view';
'require poll';
'require ui';
'require esim';

function renderSignalBars(rsrp) {
	const val = parseInt(rsrp, 10);
	let bars = 0;
	if (!isNaN(val)) {
		if (val >= -80)  bars = 5;
		else if (val >= -90)  bars = 4;
		else if (val >= -100) bars = 3;
		else if (val >= -110) bars = 2;
		else bars = 1;
	}
	const heights = [4, 7, 10, 14, 18];
	return E('div', { class: 'esim-signal-bars' },
		heights.map((h, i) => E('div', {
			class: 'esim-signal-bar' + (i < bars ? ' active' : ''),
			style: `height:${h}px`,
		}))
	);
}

function renderStatCard(label, value, cls) {
	return E('div', { class: 'esim-stat' }, [
		E('div', { class: 'esim-stat-label' }, label),
		E('div', { class: 'esim-stat-value ' + (cls || '') }, value),
	]);
}

function renderLogLine(line) {
	const ts   = line.match(/^\[([^\]]+)\]/);
	const rest = line.replace(/^\[[^\]]+\]\s*/, '');
	return E('div', { class: 'esim-log-line' }, [
		ts ? E('span', { class: 'ts' }, ts[0]) : '',
		' ',
		E('span', { class: 'msg' }, rest),
	]);
}

return view.extend({
	title: _('eSIM Overview'),

	load() {
		return Promise.all([
			esim.getInfo(),
			esim.listProfiles(),
			esim.getSystemLog({ lines: 60 }),
		]);
	},

	poll([ info, profiles, logData ]) {
		return Promise.all([
			esim.getInfo(),
			esim.listProfiles(),
			esim.getSystemLog({ lines: 60 }),
		]);
	},

	render([ info, profiles, logData ]) {
		info     = info     || {};
		profiles = Array.isArray(profiles) ? profiles : [];
		const logText = (logData && logData.log) ? logData.log : '';

		const activeProfile = profiles.find(p => p.state === 'enabled') || {};
		const profCount     = profiles.length;

		// Start polling
		poll.add(() => this.load().then(data => {
			const node = document.getElementById('esim-overview-root');
			if (node) node.replaceWith(this.renderContent(...data));
		}), 10);

		return this.renderContent(info, profiles, logData);
	},

	renderContent(info, profiles, logData) {
		info     = info     || {};
		profiles = Array.isArray(profiles) ? profiles : [];
		const logText    = (logData && logData.log) ? logData.log : '';
		const active     = profiles.find(p => p.state === 'enabled') || {};
		const profCount  = profiles.length;

		const logLines   = logText.split('\\n').filter(Boolean);

		const node = E('div', { id: 'esim-overview-root', class: 'esim-page' }, [

			E('div', { class: 'esim-page-header' }, [
				E('div', {}, [
					E('h2', { class: 'esim-page-title' }, _('System Overview')),
					E('div', { class: 'esim-page-sub' }, `lpac ${info.lpac_version || '—'}`),
				]),
				E('button', {
					class: 'esim-btn',
					click: () => this.load().then(d => {
						const r = document.getElementById('esim-overview-root');
						if (r) r.replaceWith(this.renderContent(...d));
					}),
				}, '↺ ' + _('Refresh')),
			]),

			// Stat row
			E('div', { class: 'esim-stat-row' }, [
				renderStatCard(_('Active Profile'), active.nickname || active.iccid || _('none'), 'green'),
				renderStatCard(_('eUICC State'),
					info.at_device_present ? _('ready') : _('offline'),
					info.at_device_present ? 'green' : 'red'),
				renderStatCard(_('Profiles Stored'), `${profCount} / 5`, 'amber'),
			]),

			// Chip info card
			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('eUICC Chip')),
					E('span', { class: 'esim-badge ' + (info.at_device_present ? 'active' : 'inactive') },
						info.at_device_present ? '● ' + _('ready') : '○ ' + _('offline')),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, 'EID'),
					E('span', { class: 'esim-info-val mono small' }, info.eid || '—'),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('APDU Device')),
					E('span', { class: 'esim-info-val green' }, info.at_device || '—'),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('SGP Spec')),
					E('span', { class: 'esim-info-val' }, info.sgp_spec || 'SGP.22 v2.4'),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('lpac Version')),
					E('span', { class: 'esim-info-val' }, info.lpac_version || '—'),
				]),
			]),

			// Active profile card
			active.iccid ? E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('Active Profile')),
					E('span', { class: 'esim-badge active' }, '● ' + _('enabled')),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('Name')),
					E('span', { class: 'esim-info-val' }, active.nickname || _('(unnamed)')),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, 'ICCID'),
					E('span', { class: 'esim-info-val mono' }, esim.formatIccid(active.iccid)),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('Provider')),
					E('span', { class: 'esim-info-val' }, active.provider_name || '—'),
				]),
				E('div', { class: 'esim-info-row' }, [
					E('span', { class: 'esim-info-key' }, _('Profile Class')),
					E('span', { class: 'esim-info-val' }, active.profile_class || '—'),
				]),
			]) : E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('Active Profile')),
				]),
				E('div', { class: 'esim-empty-state' }, [
					E('div', { class: 'esim-empty-text' }, _('No profile enabled — go to Profiles to activate one.')),
				]),
			]),

			// Log card
			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('System Log')),
					E('span', { class: 'esim-badge inactive' }, `${logLines.length} lines`),
				]),
				E('div', { class: 'esim-log-area' },
					logLines.length
						? logLines.map(renderLogLine)
						: [E('span', { class: 'esim-dimmed' }, _('Log is empty'))]),
			]),
		]);

		return node;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
