'use strict';
// view/esim/download.js — profile download via SM-DP+ activation code

'require view';
'require ui';
'require esim';

const DL_STEPS = [
	[10,  _('Initiating ES9+ session...')],
	[25,  _('Authenticating with SM-DP+ server...')],
	[40,  _('Downloading profile metadata...')],
	[60,  _('Retrieving Bound Profile Package...')],
	[75,  _('Verifying certificate chain...')],
	[90,  _('Writing profile to eUICC (APDU)...')],
	[100, _('Profile installed successfully')],
];

return view.extend({
	title: _('Download Profile'),

	load() { return Promise.resolve(); },

	_activeTab: 'activation',

	render() {
		const acInput  = E('input', { class: 'esim-form-input', id: 'dl-ac-input',
			placeholder: 'LPA:1$smdp.example.com$MATCHING-ID', style: 'width:100%' });
		const ccInput  = E('input', { class: 'esim-form-input', id: 'dl-cc-input',
			placeholder: _('Leave blank if not required') });

		const smdpInput = E('input', { class: 'esim-form-input', placeholder: 'smdp.carrier.com', style: 'width:100%' });
		const midInput  = E('input', { class: 'esim-form-input', placeholder: 'A1B2C3D4E5F6' });
		const imeiInput = E('input', { class: 'esim-form-input', placeholder: '358240051111110' });
		const mccInput  = E('input', { class: 'esim-form-input', placeholder: _('Leave blank') });
		const cc2Input  = E('input', { class: 'esim-form-input', placeholder: _('Leave blank if not required') });

		const progressBar   = E('div', { class: 'esim-progress-bar', style: 'display:none' }, [
			E('div', { class: 'esim-progress-step', id: 'dl-step-label' }, ''),
			E('div', { class: 'esim-progress-track' }, [
				E('div', { class: 'esim-progress-fill', id: 'dl-progress-fill', style: 'width:0%' }),
			]),
		]);

		const alertArea = E('div', { id: 'dl-alert' });

		let tabActivation, tabManual, paneActivation, paneManual;

		const switchTab = (name) => {
			this._activeTab = name;
			[tabActivation, tabManual].forEach(t =>
				t.classList.toggle('active', t.dataset.tab === name));
			[paneActivation, paneManual].forEach(p =>
				p.style.display = p.dataset.pane === name ? 'block' : 'none');
		};

		tabActivation = E('div', { class: 'esim-tab active', 'data-tab': 'activation',
			click: () => switchTab('activation') }, _('Activation Code'));
		tabManual = E('div', { class: 'esim-tab', 'data-tab': 'manual',
			click: () => switchTab('manual') }, _('Manual Entry'));

		paneActivation = E('div', { 'data-pane': 'activation', style: 'display:block' }, [
			E('div', { class: 'esim-form-group' }, [
				E('div', { class: 'esim-form-label' }, _('Activation Code')),
				acInput,
				E('div', { class: 'esim-form-hint' },
					_('Format: LPA:1$server$matchingID — paste directly from carrier or scan QR')),
			]),
			E('div', { class: 'esim-form-group', style: 'margin-top:12px' }, [
				E('div', { class: 'esim-form-label' }, _('Confirmation Code (optional)')),
				ccInput,
			]),
		]);

		paneManual = E('div', { 'data-pane': 'manual', style: 'display:none' }, [
			E('div', { class: 'esim-form-group' }, [
				E('div', { class: 'esim-form-label' }, _('SM-DP+ Server Address')),
				smdpInput,
			]),
			E('div', { class: 'esim-info-grid', style: 'margin-top:12px' }, [
				E('div', { class: 'esim-form-group' }, [
					E('div', { class: 'esim-form-label' }, _('Matching ID')),
					midInput,
				]),
				E('div', { class: 'esim-form-group' }, [
					E('div', { class: 'esim-form-label' }, _('IMEI (optional)')),
					imeiInput,
				]),
			]),
			E('div', { class: 'esim-info-grid', style: 'margin-top:12px' }, [
				E('div', { class: 'esim-form-group' }, [
					E('div', { class: 'esim-form-label' }, _('Object ID (optional)')),
					mccInput,
				]),
				E('div', { class: 'esim-form-group' }, [
					E('div', { class: 'esim-form-label' }, _('Confirmation Code (optional)')),
					cc2Input,
				]),
			]),
		]);

		const dlBtn = E('button', { class: 'esim-btn primary', click: () => startDownload() },
			'↓ ' + _('Download & Install'));

		function showProgress(pct, label) {
			progressBar.style.display = 'block';
			document.getElementById('dl-step-label').textContent = label;
			document.getElementById('dl-progress-fill').style.width = pct + '%';
		}

		function showAlert(msg, type) {
			const cls = type === 'success' ? 'success' : 'warn';
			alertArea.innerHTML = '';
			alertArea.appendChild(E('div', { class: 'esim-alert ' + cls }, msg));
			setTimeout(() => alertArea.innerHTML = '', 6000);
		}

		let running = false;

		function startDownload() {
			if (running) return;

			let params = {};

			if (this._activeTab === 'manual') {
				const smdp = smdpInput.value.trim();
				if (!smdp) { showAlert(_('Enter a SM-DP+ server address.'), 'warn'); return; }
				params = {
					smdp: smdp,
					matching_id: midInput.value.trim(),
					confirmation_code: cc2Input.value.trim(),
					imei: imeiInput.value.trim(),
				};
			} else {
				const ac = acInput.value.trim();
				if (!ac) { showAlert(_('Enter an activation code.'), 'warn'); return; }
				const parsed = esim.parseActivationCode(ac);
				if (!parsed.smdp) { showAlert(_('Invalid activation code format.'), 'warn'); return; }
				params = {
					activation_code: ac,
					smdp: parsed.smdp,
					matching_id: parsed.matchingId,
					confirmation_code: ccInput.value.trim() || parsed.confirmationCode,
				};
			}

			running = true;
			dlBtn.disabled = true;
			alertArea.innerHTML = '';

			// Animate progress steps while real RPC call runs
			let stepIdx = 0;
			const stepTimer = setInterval(() => {
				if (stepIdx < DL_STEPS.length - 1) {
					showProgress(...DL_STEPS[stepIdx]);
					stepIdx++;
				}
			}, 800);

			esim.downloadProfile(params).then(() => {
				clearInterval(stepTimer);
				showProgress(100, _('Profile installed successfully'));
				showAlert(_('✓ Profile downloaded and installed. Go to Profiles to activate.'), 'success');
				acInput.value = '';
				progressBar.style.display = 'none';
			}).catch(err => {
				clearInterval(stepTimer);
				progressBar.style.display = 'none';
				showAlert(_('Download failed: ') + (err.message || err), 'warn');
			}).finally(() => {
				running = false;
				dlBtn.disabled = false;
			});
		}

		// Bind this context for inner function
		startDownload = startDownload.bind(this);

		return E('div', { class: 'esim-page' }, [
			E('div', { class: 'esim-page-header' }, [
				E('div', {}, [
					E('h2', { class: 'esim-page-title' }, _('Download Profile')),
					E('div', { class: 'esim-page-sub' }, _('Install via SM-DP+ activation code')),
				]),
			]),

			alertArea,

			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-tabs' }, [tabActivation, tabManual]),
				paneActivation,
				paneManual,
				E('div', { style: 'margin-top:16px;display:flex;align-items:center;gap:10px' }, [
					dlBtn,
				]),
				progressBar,
			]),

			// Info card
			E('div', { class: 'esim-card', style: 'margin-top:12px' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('About SM-DP+ Activation Codes')),
				]),
				E('p', { style: 'font-size:13px;color:var(--color-text-secondary);line-height:1.6' }, [
					_('Activation codes are provided by your carrier after purchasing an eSIM plan. ' +
					'They follow the format '),
					E('code', {}, 'LPA:1$smdp.example.com$MATCHING-CODE'),
					_(', typically embedded in a QR code. ' +
					'Paste the code directly or enter the SM-DP+ address and matching ID separately.'),
				]),
			]),
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
