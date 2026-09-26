/**
 * 程序合成音效（WebAudio）
 * 不依赖任何音频资源文件，全部实时合成
 * 浏览器自动播放策略：需在用户首次触摸后 resume
 */
export class SoundFX {
    private static inst: SoundFX;
    public static get I(): SoundFX {
        if (!SoundFX.inst) { SoundFX.inst = new SoundFX(); }
        return SoundFX.inst;
    }

    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private noiseBuf: AudioBuffer | null = null;
    private enabled = true;

    public init() {
        try {
            if (!this.ctx) {
                const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!AC) { this.enabled = false; return; }
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = 0.45;
                this.master.connect(this.ctx.destination);

                // 预生成白噪声缓冲（爆炸用）
                const len = Math.floor(this.ctx.sampleRate * 0.5);
                this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
                const data = this.noiseBuf.getChannelData(0);
                for (let i = 0; i < len; i++) { data[i] = Math.random() * 2 - 1; }
            }
            if (this.ctx.state === 'suspended') { this.ctx.resume(); }
        } catch (e) {
            this.enabled = false;
        }
    }

    /** 单音：频率从 start 滑到 end */
    private tone(start: number, end: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
        if (!this.enabled || !this.ctx || !this.master) return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(start, 1), t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    private noise(dur: number, vol: number, cutoff: number) {
        if (!this.enabled || !this.ctx || !this.master || !this.noiseBuf) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = cutoff;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + dur);
    }

    public shoot() { this.tone(820, 320, 0.08, 'square', 0.045); }
    public enemyShoot() { this.tone(300, 180, 0.1, 'sawtooth', 0.04); }
    public boom(big = false) {
        this.noise(big ? 0.55 : 0.25, big ? 0.55 : 0.3, big ? 900 : 1500);
        this.tone(big ? 150 : 230, 40, big ? 0.45 : 0.2, 'sawtooth', big ? 0.25 : 0.12);
    }
    public hurt() { this.tone(190, 60, 0.25, 'square', 0.2); }
    public shieldBreak() { this.tone(420, 90, 0.3, 'triangle', 0.25); }
    public levelup() {
        this.tone(523, 523, 0.09, 'square', 0.14);
        this.tone(659, 659, 0.09, 'square', 0.14, 0.09);
        this.tone(784, 784, 0.16, 'square', 0.14, 0.18);
    }
    public bossAlarm() {
        this.tone(98, 98, 0.28, 'sawtooth', 0.3);
        this.tone(98, 98, 0.28, 'sawtooth', 0.3, 0.38);
    }
    public pick() { this.tone(1150, 1550, 0.05, 'sine', 0.05); }
    public missile() { this.tone(900, 240, 0.3, 'sawtooth', 0.07); this.noise(0.18, 0.06, 2200); }
    public hit() { this.tone(520, 90, 0.12, 'sawtooth', 0.12); }
    public power() {
        this.tone(660, 660, 0.07, 'square', 0.12);
        this.tone(880, 880, 0.07, 'square', 0.12, 0.08);
        this.tone(1174, 1174, 0.12, 'square', 0.12, 0.16);
    }
}
