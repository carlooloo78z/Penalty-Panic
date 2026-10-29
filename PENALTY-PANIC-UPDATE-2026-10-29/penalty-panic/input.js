(function(root){
  'use strict';
  const P=root.Panic,directions=['KeyA','KeyD','KeyQ','KeyE','KeyW','KeyS'];
  class GameInput {
    constructor(app,canvas){
      this.app=app;this.canvas=canvas;this.keys=new Set();this.pointer=null;this.drag=null;this.fieldPointers=new Map();
      document.addEventListener('keydown',e=>this.down(e));document.addEventListener('keyup',e=>this.up(e));
      document.addEventListener('pointerdown',e=>{
        const fieldButton=e.target.closest('[data-field-move],[data-field-hold]');
        if(fieldButton&&this.active()&&this.app.sim.g.phase==='field'){
          e.preventDefault();fieldButton.setPointerCapture?.(e.pointerId);this.app.audio.unlock();
          this.fieldPointers.set(e.pointerId,{move:fieldButton.dataset.fieldMove,hold:fieldButton.dataset.fieldHold});
          if(fieldButton.dataset.fieldHold==='shoot')P.fieldCharge(this.app.sim.g);return;
        }
        if(e.target.closest('#shoot')&&this.active()){
          e.preventDefault();this.pointer=e.pointerId;e.target.setPointerCapture?.(e.pointerId);this.app.sim.charge();this.app.audio.unlock();
        }
      });
      document.addEventListener('pointerup',e=>{
        const held=this.fieldPointers.get(e.pointerId);if(held){this.fieldPointers.delete(e.pointerId);if(held.hold==='shoot'&&this.active())P.fieldShoot(this.app.sim.g);}
        if(e.pointerId===this.pointer){this.pointer=null;if(this.active())this.app.sim.release();this.app.process();}
      });
      document.addEventListener('pointercancel',()=>this.clear());
      canvas.addEventListener('pointerdown',e=>{
        if(!this.active())return;
        if(this.app.sim.g.phase==='field'){
          if(this.app.sim.g.field.saveWindow){const p=this.app.renderer.point(e);e.preventDefault();canvas.focus({preventScroll:true});this.selectDive(p.x,p.y);return;}
          if(this.app.sim.g.field.finish){const p=this.app.renderer.point(e),aim=P.fieldAimPoint(this.app.sim.g.field,p.x,p.y);e.preventDefault();canvas.focus({preventScroll:true});if(aim)P.fieldFinishAim(this.app.sim.g,aim.x,aim.y);return;}
          const p=P.fieldPoint(this.app.renderer,e);e.preventDefault();canvas.focus({preventScroll:true});this.app.sim.g.field.aim={x:P.clamp(p.x,-15,1015),y:P.clamp(p.y,0,600)};return;
        }
        const p=this.app.renderer.point(e);if(!this.app.renderer.inGoal(p))return;
        e.preventDefault();canvas.focus({preventScroll:true});
        if(this.app.sim.g.role==='shoot'){
          this.app.sim.aim(p.x,p.y);this.drag=e.pointerId;canvas.setPointerCapture?.(e.pointerId);
        }else this.selectDive(p.x,p.y);
      });
      canvas.addEventListener('pointermove',e=>{if(this.drag===e.pointerId&&this.active()){const p=this.app.renderer.point(e);this.app.sim.aim(p.x,p.y);}});
      canvas.addEventListener('pointerup',()=>{this.drag=null;});
      root.addEventListener('blur',()=>app.pause());
      document.addEventListener('visibilitychange',()=>{if(document.hidden)app.pause();});
    }
    active(){return this.app.sim&&!this.app.paused&&!this.app.modal.open&&!this.app.victory;}
    clear(){this.keys.clear();this.fieldPointers.clear();this.pointer=null;this.drag=null;if(this.app.sim){const g=this.app.sim.g;g.charging=false;g.divePreview=null;if(g.field){g.field.charging=false;g.field.input={x:0,y:0,sprint:false};}}}
    selectDive(x,y){
      if(!this.active())return;
      if(this.app.sim.g.field?.saveWindow){this.app.sim.fieldDive(x,y);return;}
      const g=this.app.sim.g;g.divePreview=P.divePoint(x,y);
      if(this.app.save.settings.controlPreset==='chords')this.app.sim.dive(x,y);
      this.app.highlightDive();
    }
    commit(){if(!this.active())return;const w=this.app.sim.g.field?.saveWindow;if(w){this.app.sim.fieldDive(w.preview.x,w.preview.y);return;}const p=this.app.sim.g.divePreview||{x:500,y:250};this.app.sim.dive(p.x,p.y);}
    down(e){
      if(this.app.victory&&!this.app.modal.open){
        const otherControl=e.target.closest('button,input,select,textarea,a')&&!e.target.closest('[data-action="skip-victory"]');
        if(e.code==='Escape'||(!otherControl&&['Space','Enter'].includes(e.code))){e.preventDefault();if(!e.repeat)this.app.finishVictory();}
        return;
      }
      if(e.code==='Escape'){e.preventDefault();if(this.app.modal.open)this.app.closeDialog();else this.app.pause();return;}
      if(!this.active()||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      const g=this.app.sim.g;
      if(g.phase==='interval'){if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)this.app.next();}return;}
      if(g.phase==='field'){
        if(g.field.saveWindow){
          const button=e.target.closest('button');
          if(button&&['Space','Enter'].includes(e.code)){if(button.dataset.dive){e.preventDefault();if(!e.repeat)this.selectDive(...button.dataset.dive.split(',').map(Number));}return;}
          const w=g.field.saveWindow;if(w.result||w.dive)return;
          const quick={KeyZ:[245,320],KeyC:[755,320],ArrowLeft:[245,250],ArrowRight:[755,250],ArrowUp:[500,185],ArrowDown:[500,320]};
          if(directions.includes(e.code)){e.preventDefault();this.keys.add(e.code);w.preview=P.keysToTarget(this.keys);if((this.keys.has('KeyW')||this.keys.has('KeyS'))&&['KeyA','KeyD','KeyQ','KeyE'].some(k=>this.keys.has(k)))this.commit();}
          else if(quick[e.code]){e.preventDefault();if(!e.repeat)this.selectDive(...quick[e.code]);}
          else if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)this.commit();}return;
        }
        if(g.field.celebration&&['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)P.fieldSkipCelebration(g);return;}
        if(g.field.state==='restart'&&e.code==='Space'){e.preventDefault();if(!e.repeat)P.fieldRestart(g);return;}
        const allowed=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','KeyQ','KeyE','KeyX'];
        if(!allowed.includes(e.code))return;e.preventDefault();this.keys.add(e.code);
        if(e.repeat)return;
        if(e.code==='Space')P.fieldCharge(g);
        if(e.code==='KeyQ')this.app.passField();
        if(e.code==='KeyE')P.fieldSwitch(g);
        if(e.code==='KeyX'&&P.fieldTackle(g))this.app.audio.play('gloves');return;
      }
      if(g.phase==='feedback'&&['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)this.app.next();return;}
      if(e.code==='Space'||e.code.startsWith('Arrow')||directions.includes(e.code))e.preventDefault();
      if(g.role==='shoot'){
        if(g.phase!=='aim')return;
        if(e.code==='Space'&&!e.repeat)this.app.sim.charge();
        if(e.code.startsWith('Arrow'))this.keys.add(e.code);
        if(['KeyQ','KeyE'].includes(e.code)&&!e.repeat){g.curl=P.clamp(g.curl+(e.code==='KeyQ'?-1:1),-1,1);const select=document.querySelector('#curl');if(select)select.value=String(g.curl);}
      }else{
        if(!['read','flight'].includes(g.phase)||g.dive)return;
        if(directions.includes(e.code)&&!e.repeat){
          this.keys.add(e.code);g.divePreview=P.keysToTarget(this.keys);
          const height=this.keys.has('KeyS')||this.keys.has('KeyW'),side=['KeyA','KeyD','KeyQ','KeyE'].some(k=>this.keys.has(k));
          if(height&&side&&this.app.save.settings.controlPreset==='chords')this.commit();
          this.app.highlightDive();
        }
        const quick={KeyZ:[245,320],KeyC:[755,320],ArrowLeft:[245,250],ArrowRight:[755,250],ArrowUp:[500,185],ArrowDown:[500,320]};
        if(quick[e.code]&&!e.repeat)this.selectDive(...quick[e.code]);
        if(e.code==='Space'&&!e.repeat)this.commit();
      }
    }
    up(e){
      if(this.active()){
        const g=this.app.sim.g;
        if(g.phase==='field'){if(g.field.saveWindow){if(directions.includes(e.code)&&this.keys.has(e.code))this.commit();}else if(e.code==='Space')P.fieldShoot(g);this.keys.delete(e.code);return;}
        if(g.role==='keep'&&this.keys.has(e.code)&&this.app.save.settings.controlPreset==='chords')this.commit();
        if(e.code==='Space'&&g.role==='shoot'){this.app.sim.release();this.app.process();}
      }
      this.keys.delete(e.code);
    }
    update(dt){
      if(!this.active())return;const g=this.app.sim.g;
      if(g.phase==='field'){
        if(g.field.saveWindow)return;
        let x=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
        let y=Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'));
        if(g.field.finish){const a=g.field.finish.aim;if(x||y)P.fieldFinishAim(g,a.x+x*300*dt,a.y+y*180*dt);return;}
        let sprint=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
        for(const held of this.fieldPointers.values()){if(held.move){const [mx,my]=held.move.split(',').map(Number);x+=mx;y+=my;}if(held.hold==='sprint')sprint=true;}
        const direction=P.fieldVector(this.app.renderer,x,y);P.fieldMove(g,direction.x,direction.y,sprint);return;
      }
      if(g.phase!=='aim')return;
      const dx=Number(this.keys.has('ArrowRight'))-Number(this.keys.has('ArrowLeft')),dy=Number(this.keys.has('ArrowDown'))-Number(this.keys.has('ArrowUp'));
      if(dx||dy)this.app.sim.aim(g.aim.x+dx*240*dt,g.aim.y+dy*180*dt);
    }
  }
  P.GameInput=GameInput;
})(window);
