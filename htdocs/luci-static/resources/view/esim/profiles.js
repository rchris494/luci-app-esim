'use strict';
// view/esim/profiles.js — installed profile list with enable/delete actions

'require view';
'require ui';
'require esim';

const CARRIER_COLORS = {
	default: { bg: '#1a2f4b', text: '#58a6ff' },
	T:       { bg: '#1a1a3a', text: '#a78bfa' },
	A:       { bg: '#2e1a0e', text: '#d29922' },
	H:       { bg: '#1a2e1a', text: '#3fb950' },
	V:       { bg: '#1a1a1a', text: '#e5e5e5' },
};

function carrierColor(name) {
	const key = (name || '').charAt(0).toUpperCase();
	return CARRIER_COLORS[key] || CARRIER_COLORS.default;
}

function carrierInitials(name) {
	return (name || '??').slice(0, 3).toUpperCase();
}

function profileStateLabel(p) {
	if (p.state === 'enabled') return { cls: 'active', text: '● ' + _('active') };
	if (p.state === 'disabled') return { cls: 'inactive', text: '○ ' + _('disabled') };
	return { cls: 'inactive', text: p.state || _('unknown') };
}

return view.extend({
	title: _('eSIM Profiles'),

	load() {
		return esim.listProfiles();
	},

	handleEnable(iccid) {
		const btn = document.querySelector(`[data-action="enable"][data-iccid="${iccid}"]`);
		if (btn) btn.disabled = true;

		ui.showModal(_('Switching Profile'), [
			E('p', {}, _('Enabling profile — the modem will reconnect momentarily...')),
		]);

		esim.enableProfile({ iccid }).then(() => {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, _('Profile enabled. Interface restarting.')), 'info');
			return this.load().then(profiles => {
				const root = document.getElementById('esim-profiles-root');
				if (root) root.replaceWith(this.renderContent(profiles));
			});
		}).catch(err => {
			ui.hideModal();
			esim.showError(_('enabling profile'), err);
			if (btn) btn.disabled = false;
		});
	},

	handleDisable(iccid) {
		esim.disableProfile({ iccid }).then(() => {
			ui.addNotification(null, E('p', {}, _('Profile disabled.')), 'info');
			return this.load().then(profiles => {
				const root = document.getElementById('esim-profiles-root');
				if (root) root.replaceWith(this.renderContent(profiles));
			});
		}).catch(err => esim.showError(_('disabling profile'), err));
	},

	handleDelete(iccid, name) {
		ui.showModal(_('Delete Profile'), [
			E('p', {}, _('Permanently delete profile "%s" from the eUICC?').format(name || iccid)),
			E('p', { class: 'esim-warn-text' }, _('This cannot be undone. The profile will need to be re-downloaded.')),
			E('div', { class: 'esim-modal-actions' }, [
				E('button', {
					class: 'esim-btn danger',
					click: () => {
						ui.hideModal();
						esim.deleteProfile({ iccid }).then(() => {
							ui.addNotification(null, E('p', {}, _('Profile deleted.')), 'info');
							return this.load().then(profiles => {
								const root = document.getElementById('esim-profiles-root');
								if (root) root.replaceWith(this.renderContent(profiles));
							});
						}).catch(err => esim.showError(_('deleting profile'), err));
					},
				}, _('Delete')),
				E('button', {
					class: 'esim-btn',
					click: () => ui.hideModal(),
				}, _('Cancel')),
			]),
		]);
	},

	render(profiles) {
		return this.renderContent(Array.isArray(profiles) ? profiles : []);
	},

	renderContent(profiles) {
		const node = E('div', { id: 'esim-profiles-root', class: 'esim-page' }, [

			E('div', { class: 'esim-page-header' }, [
				E('div', {}, [
					E('h2', { class: 'esim-page-title' }, _('eSIM Profiles')),
					E('div', { class: 'esim-page-sub' }, _('Manage profiles installed on eUICC')),
				]),
				E('a', { class: 'esim-btn primary', href: L.url('admin', 'network', 'esim', 'download') },
					'+ ' + _('Download New')),
			]),

			profiles.length === 0
				? E('div', { class: 'esim-empty-state' }, [
					E('div', { class: 'esim-empty-icon' }, '□'),
					E('div', { class: 'esim-empty-text' }, _('No profiles installed.')),
					E('div', { class: 'esim-empty-sub' }, _('Download a profile to get started.')),
				])
				: E('div', { class: 'esim-profile-list' },
					profiles.map(p => {
						const stateInfo = profileStateLabel(p);
						const color = carrierColor(p.provider_name || p.nickname);
						const isActive = p.state === 'enabled';

						return E('div', { class: 'esim-profile-item' + (isActive ? ' active-profile' : '') }, [
							// Carrier initials badge
							E('div', {
								class: 'esim-carrier-badge',
								style: `background:${color.bg};color:${color.text}`,
							}, carrierInitials(p.provider_name || p.nickname)),

							// Info block
							E('div', { class: 'esim-profile-info' }, [
								E('div', { class: 'esim-profile-name' },
									p.nickname || p.provider_name || _('(unnamed)')),
								E('div', { class: 'esim-profile-iccid mono' },
									'ICCID: ' + esim.formatIccid(p.iccid)),
								E('div', { class: 'esim-profile-meta' }, [
									E('span', { class: 'esim-badge ' + stateInfo.cls }, stateInfo.text),
									p.profile_class
										? E('span', { class: 'esim-badge enabled' }, p.profile_class)
										: '',
								]),
							]),

							// Actions
							E('div', { class: 'esim-profile-actions' }, [
								isActive
									? E('button', {
										class: 'esim-btn sm',
										style: 'opacity:0.4;cursor:default',
										disabled: true,
									}, _('Active'))
									: E('button', {
										class: 'esim-btn sm primary',
										'data-action': 'enable',
										'data-iccid': p.iccid,
										click: () => this.handleEnable(p.iccid),
									}, _('Enable')),
								E('button', {
									class: 'esim-btn sm danger',
									click: () => this.handleDelete(p.iccid, p.nickname || p.provider_name),
								}, _('Delete')),
							]),
						]);
					})
				),

			// Notifications card
			E('div', { class: 'esim-card', style: 'margin-top:16px' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('RSP Notifications')),
				]),
				E('p', { style: 'font-size:13px;color:var(--color-text-secondary);margin-bottom:10px' },
					_('Send pending install/delete events to operator RSP servers.')),
				E('button', {
					class: 'esim-btn',
					click: () => {
						esim.sendNotifications().then(() =>
							ui.addNotification(null, E('p', {}, _('Notifications sent.')), 'info')
						).catch(err => esim.showError(_('sending notifications'), err));
					},
				}, _('Send Notifications')),
			]),
		]);

		return node;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
