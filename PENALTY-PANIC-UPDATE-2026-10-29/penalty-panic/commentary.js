(function(root){
  'use strict';
  const P=root.Panic;
  class GameCommentary {
    constructor(settings,display){this.settings=settings;this.display=display;this.unlocked=false;this.reset();}
    reset(g,resumed=false){
      this.stop();this.g=g;this.clock=g?.time||0;this.lastAt=-100;this.priority=0;this.text='';this.seen=new Set();this.previous=this.state(g);this.display?.('');
      if(g&&!resumed)this.line(`Max Vale here. ${g.team.name} against ${g.opponent.name}. Let's play!`,2,'intro');
    }
    unlock(){this.unlocked=true;}
    voice(){try{return root.speechSynthesis?.getVoices().filter(v=>v.localService&&/^en\b/i.test(v.lang)).sort((a,b)=>Number(/^en-GB/i.test(b.lang))-Number(/^en-GB/i.test(a.lang))||Number(b.default)-Number(a.default))[0]||null;}catch{return null;}}
    status(){return this.voice()?'Device voice ready.':'Voice unavailable on this device; live captions still work.';}
    stop(){if(this.utterance){this.utterance=null;try{root.speechSynthesis?.cancel();}catch{}}}
    syncSettings(){this.stop();this.display?.(this.settings().commentaryCaptions?this.text:'');}
    line(text,priority=1,key=text){
      if(this.seen.has(key)||priority<3&&this.clock-this.lastAt<3.5||priority<this.priority&&this.clock-this.lastAt<3)return false;
      this.seen.add(key);if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);
      this.text=text;this.lastAt=this.clock;this.priority=priority;this.display?.(this.settings().commentaryCaptions?text:'');
      const s=this.settings(),voice=this.voice();
      if(!this.unlocked||!s.commentary||s.mute||!s.master||!s.commentaryVolume||!voice||!root.SpeechSynthesisUtterance)return true;
      if(this.utterance&&priority<3)return true;
      this.stop();
      try{
        const u=new root.SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang;u.volume=P.clamp(s.master*s.commentaryVolume,0,1);u.rate=priority>=3?1.13:1.05;u.pitch=priority>=3?1.08:1;
        u.onend=u.onerror=()=>{if(this.utterance===u)this.utterance=null;};this.utterance=u;root.speechSynthesis.speak(u);
      }catch{this.utterance=null;}
      return true;
    }
    state(g){const f=g?.field;return f?{owner:f.ball.owner,tackles:f.tackles,state:f.state,time:f.elapsed}:null;}
    observe(g){
      if(!g)return;this.g=g;this.clock=g.time;const f=g.field,previous=this.previous,next=this.state(g);this.previous=next;
      if(!f||!previous)return;
      if(previous.state==='ready'&&f.state==='live')this.line(`${P.playerName(g,f.ball.owner??3)} gets us under way.`,2,'kickoff:'+f.elapsed);
      else if(f.state==='live'&&f.tackles>previous.tackles)this.line(`${P.playerName(g,f.controlled)} wins the ball!`,2,'tackle:'+f.tackles);
      else if(f.state==='live'&&f.ball.owner!==null&&previous.owner!==f.ball.owner)this.line(`${P.playerName(g,f.ball.owner)} in possession.`,1,'possession:'+f.ball.owner+':'+Math.floor(g.time/8));
      const remaining=P.fieldDuration(f)-f.elapsed;
      if(f.state==='live'&&remaining<=15&&remaining>0)this.line(f.score[0]===f.score[1]?'Fifteen seconds left, and it is still level!':'Into the final fifteen seconds!',3,'last-fifteen');
    }
    event(e,g){
      this.g=g;this.clock=g.time;const f=g.field,name=id=>P.playerName(g,id),score=f?`${g.team.name} ${f.score[0]}, ${g.opponent.name} ${f.score[1]}.`:'';
      if(e.type==='field-goal')this.line(f.celebration?.ownGoal?`An own goal! ${score}`:`${name(e.scorer)} scores! ${score}`,4,'goal:'+f.score.join(':'));
      else if(e.type==='field-save')this.line(`${name(e.team*5)} makes the save!`,3,'save:'+e.team+':'+f.saves.join(':'));
      else if(e.type==='field-kick'){
        const id=f.ball.lastPlayer??3;
        this.line(f.ball.shot?`${name(id)} takes the shot!`:id%5===0?`${name(id)} sends it upfield.`:`${name(id)} plays the pass.`,1,'kick:'+g.time);
      }else if(e.type==='field-foul')this.line(`${f.foul.kind==='penalty'?'Penalty':'Free kick'}! ${name(f.foul.taker)} was brought down.`,3,'foul:'+f.fouls.join(':'));
      else if(e.type==='field-end')this.line(`Full time. ${score}`,4,'full-time:'+f.elapsed);
      else if(e.type==='resolved'){
        const shooter=g.role==='shoot'?3:8,keeper=g.role==='shoot'?5:0;
        this.line(e.event==='goal'?`${name(shooter)} scores from the spot!`:e.event==='save'?`${name(keeper)} stops ${name(shooter)}!`:e.event==='post'?`${name(shooter)} hits the woodwork!`:`${name(shooter)} puts it wide.`,3,'penalty:'+g.round+':'+g.role);
      }else if(e.type==='complete')this.line(g.result==='win'?`${g.team.name} take the win!`:g.result==='loss'?`${g.opponent.name} win this one.`:g.result==='draw'?'All square. A point for each side.':'The challenge is complete!',4,'complete');
    }
  }
  P.GameCommentary=GameCommentary;
})(typeof window==='undefined'?globalThis:window);
