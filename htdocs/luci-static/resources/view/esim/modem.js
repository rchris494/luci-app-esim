'use strict';
// view/esim/modem.js — modem hardware info, radio metrics, AT console

'require view';
'require poll';
'require ui';
'require esim';

const SAFE_COMMANDS = [
	'AT', 'AT+CIMI', 'AT+CGMM', 'AT+CGMI', 'AT+CGSN', 'AT+CSQ',
	'AT+CEREG?', 'AT+CGDCONT?', 'AT+QCSQ', 'AT+QNWINFO', 'AT+QTEMP',
	'AT+CGMR', 'AT+CREG?', 'AT+COPS?',
];

function infoRow(label, value, cls) {
	return E('div', { class: 'esim-info-row' }, [
		E('span', { class: 'esim-info-key' }, label),
		E('span', { class: 'esim-info-val' + (cls ? ' ' + cls : '') }, value || '—'),
	]);
}

function appendAtLog(log, dir, text, cls) {
	const line = E('div', { class: 'esim-log-line' }, [
		E('span', { class: 'ts' }, dir + ' '),
		E('span', { class: cls || '' }, text),
	]);
	log.appendChild(line);
	log.scrollTop = log.scrollHeight;
}

return view.extend({
	title: _('Modem'),

	load() {
		return esim.getModemInfo();
	},

	render(info) {
		info = info || {};

		const atLog   = E('div', { class: 'esim-log-area', id: 'at-log' });
		const atInput = E('input', {
			class: 'esim-form-input',
			id: 'at-input',
			placeholder: 'AT+CIMI',
			style: 'flex:1;padding:7px 10px',
		});

		appendAtLog(atLog, '[init]', _('AT interface ready'), 'ok');

		// Suggest completions
		atInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') sendAt();
			if (e.key === 'Tab') {
				e.preventDefault();
				const v = atInput.value.toUpperCase();
				const match = SAFE_COMMANDS.find(c => c.startsWith(v) && c !== v);
				if (match) atInput.value = match;
			}
		});

		function sendAt() {
			const cmd = atInput.value.trim();
			if (!cmd) return;
			atInput.value = '';
			appendAtLog(atLog, '$', cmd, 'cmd');
			esim.sendAt({ cmd }).then(res => {
				const resp = (res && res.response) ? res.response.replace(/\\n/g, '\n') : 'OK';
				resp.split('\n').forEach(line => {
					appendAtLog(atLog, '>', line,
						line.includes('ERROR') ? 'err' : 'ok');
				});
			}).catch(err => {
				const msg = (err && err.message) ? err.message : String(err);
				appendAtLog(atLog, '!', msg, 'err');
			});
		}

		// Signal quality colour
		const rsrp = info.rsrp || '';
		const rsrpVal = parseInt(rsrp, 10);
		const sigCls = isNaN(rsrpVal) ? '' : rsrpVal >= -80 ? 'green' : rsrpVal >= -100 ? 'amber' : 'red';

		// Temp colour
		const tempVal = parseInt(info.temperature, 10);
		const tempCls = isNaN(tempVal) ? '' : tempVal > 70 ? 'red' : tempVal > 55 ? 'amber' : 'green';

		return E('div', { class: 'esim-page' }, [

			E('div', { class: 'esim-page-header' }, [
				E('div', {}, [
					E('h2', { class: 'esim-page-title' }, _('Modem')),
					E('div', { class: 'esim-page-sub' }, info.model || _('Loading...')),
				]),
				E('button', {
					class: 'esim-btn',
					click: () => this.load().then(d => {
						const root = document.querySelector('.esim-page');
						if (root) root.replaceWith(this.render(d));
					}),
				}, '↺ ' + _('Refresh')),
			]),

			// Hardware card
			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('Hardware')),
				]),
				infoRow(_('Model'),    info.model),
				infoRow(_('Revision'), info.revision),
				infoRow(_('IMEI'),     info.imei, 'mono'),
				infoRow(_('AT Device'), info.at_device, 'green'),
			]),

			// Radio card
			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('Radio')),
				]),
				infoRow(_('CSQ'),         info.csq),
				infoRow(_('RSRP'),        rsrp ? rsrp + ' dBm' : '—', sigCls),
				infoRow(_('RSRQ'),        info.rsrq ? info.rsrq + ' dB' : '—'),
				infoRow(_('SINR'),        info.sinr ? info.sinr + ' dB' : '—'),
				infoRow(_('Temperature'), info.temperature ? info.temperature + ' °C' : '—', tempCls),
			]),

			// AT Console card
			E('div', { class: 'esim-card' }, [
				E('div', { class: 'esim-card-header' }, [
					E('span', { class: 'esim-card-title' }, _('AT Console')),
					E('span', { class: 'esim-badge inactive', style: 'font-size:10px' },
						_('Tab to complete')),
				]),
				atLog,
				E('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [
					atInput,
					E('button', {
						class: 'esim-btn',
						click: sendAt,
					}, _('Send')),
				]),
				E('div', { class: 'esim-form-hint', style: 'margin-top:6px' },
					_('Allowed: ') + SAFE_COMMANDS.join(' · ')),
			]),
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
