import { openModal } from './modal.js';
import { DEFAULT_SETTINGS, getSettings, saveSettings, resetSettings } from './storage.js';
import { getMuted, getVolume, setMuted, setVolume } from './audio.js';

export const THEMES = [
  { id:'birthday', name:'Birthday Cake', colors:['#fff9f5','#f4a0b5','#d1b3f0','#ffe5a0'] },
  { id:'lavender', name:'Lavender Dream', colors:['#faf7ff','#ad8bd4','#dac8ee','#fff3cf'] },
  { id:'peach', name:'Peach Sunset', colors:['#fff8f2','#e9917e','#f4b2a7','#f3d3a4'] },
  { id:'mint', name:'Mint Picnic', colors:['#f6fff9','#74b99a','#b8dfcf','#f3df8d'] },
];
export const FONT_SIZES = [
  { id:'small', label:'Small' }, { id:'normal', label:'Normal' },
  { id:'large', label:'Large' }, { id:'extra-large', label:'Extra large' },
];

export function applySettings(settings = getSettings(), { syncAudio = false } = {}) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.fontSize = settings.fontSize;
  if (syncAudio) { setVolume(settings.volume); setMuted(settings.muted); }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() || '#fff9f5');
}

export function openSettings() {
  const current = getSettings();
  const modal = openModal({ title:'Settings ⚙️', modalClass:'settings-modal', bodyHTML:`<div class="settings-panel"><section><p class="settings-kicker">Appearance</p><h4>Theme palette</h4><div class="theme-options" role="radiogroup" aria-label="Theme palette">${THEMES.map((theme) => `<label class="theme-option"><input type="radio" name="theme" value="${theme.id}" ${current.theme===theme.id?'checked':''}><span class="theme-card"><strong>${theme.name}</strong><span class="theme-swatches">${theme.colors.map((color)=>`<i style="--swatch:${color}"></i>`).join('')}</span></span></label>`).join('')}</div></section><section><p class="settings-kicker">Reading</p><h4>Font size</h4><div class="font-options" role="radiogroup" aria-label="Font size">${FONT_SIZES.map((size)=>`<label><input type="radio" name="font-size" value="${size.id}" ${current.fontSize===size.id?'checked':''}><span>${size.label}</span></label>`).join('')}</div></section><section><p class="settings-kicker">Sound</p><div class="volume-heading"><label for="master-volume">Master volume</label><output id="volume-output">${Math.round(current.volume*100)}%</output></div><input id="master-volume" class="settings-volume" type="range" min="0" max="100" value="${Math.round(current.volume*100)}" aria-describedby="volume-output"><button class="settings-mute" type="button" aria-pressed="${current.muted}">${current.muted?'🔇 Unmute':'🔊 Mute'}</button></section><section><p class="settings-kicker">Preferences</p><button class="settings-reset" type="button">Reset settings</button><p class="settings-note">This keeps your letters, reactions, comments, and gift progress safe.</p></section></div>` });
  if (!modal) return;
  modal.querySelectorAll('[name="theme"]').forEach((input)=>input.addEventListener('change',()=>{const next=saveSettings({theme:input.value});applySettings(next);}));
  modal.querySelectorAll('[name="font-size"]').forEach((input)=>input.addEventListener('change',()=>{const next=saveSettings({fontSize:input.value});applySettings(next);}));
  const slider=modal.querySelector('#master-volume'), output=modal.querySelector('#volume-output'), mute=modal.querySelector('.settings-mute');
  slider?.addEventListener('input',()=>{const volume=Number(slider.value)/100;output.textContent=`${slider.value}%`;setVolume(volume);});
  mute?.addEventListener('click',()=>{setMuted(!getMuted());mute.setAttribute('aria-pressed',String(getMuted()));mute.textContent=getMuted()?'🔇 Unmute':'🔊 Mute';});
  modal.querySelector('.settings-reset')?.addEventListener('click',()=>{if(!window.confirm('Reset appearance and sound settings to default?'))return;const next=resetSettings();applySettings(next,{syncAudio:true});modal.querySelector(`[name="theme"][value="${DEFAULT_SETTINGS.theme}"]`).checked=true;modal.querySelector(`[name="font-size"][value="${DEFAULT_SETTINGS.fontSize}"]`).checked=true;slider.value=String(Math.round(getVolume()*100));output.textContent=`${slider.value}%`;mute.setAttribute('aria-pressed',String(getMuted()));mute.textContent=getMuted()?'🔇 Unmute':'🔊 Mute';});
}
