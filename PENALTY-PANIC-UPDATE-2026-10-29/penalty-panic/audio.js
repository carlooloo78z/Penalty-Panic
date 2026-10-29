(function(root){
  'use strict';
  class GameAudio {
    constructor(settings){this.settings=settings;this.context=null;this.noise=null;}
    unlock(){try{this.context ||= new (root.AudioContext||root.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{}}
    play(kind){
      const s=this.settings();if(s.mute||!s.master||!s.sfx||!this.context)return;
      const c=this.context,t=c.currentTime,gain=c.createGain();gain.gain.value=s.master*s.sfx*.15;gain.connect(c.destination);
      const notes={kick:[100,65],gloves:[160,120],post:[880,625],net:[210,150],concede:[175,146],goal:[392,523,659,784],victory:[392,523,659,784,1047],save:[440,659,880],wide:[220,164],ui:[440],whistle:[1600,1800,1600]}[kind]||[330];
      notes.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=['kick','gloves','post'].includes(kind)?'triangle':'sine';o.frequency.value=f;o.connect(g);g.connect(gain);g.gain.setValueAtTime(.8,t+i*.07);g.gain.exponentialRampToValueAtTime(.001,t+i*.07+.25);o.start(t+i*.07);o.stop(t+i*.07+.28);});
      if(['goal','save','concede','victory'].includes(kind)){
        if(!this.noise){this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(.6+.4*Math.sin(i/330));}
        const src=c.createBufferSource(),filter=c.createBiquadFilter(),env=c.createGain();src.buffer=this.noise;filter.type='bandpass';filter.frequency.value=kind==='concede'?450:1000;filter.Q.value=.7;env.gain.setValueAtTime(.4,t);env.gain.exponentialRampToValueAtTime(.001,t+.8);src.connect(filter);filter.connect(env);env.connect(gain);src.start();src.stop(t+.85);
      }
      setTimeout(()=>gain.disconnect(),1500);
    }
  }
  root.Panic.GameAudio=GameAudio;
})(window);
