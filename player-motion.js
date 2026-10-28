(function(root){
  'use strict';
  const P=typeof module!=='undefined'?{...require('./progression.js'),...require('./simulation.js')}:root.Panic;
  const ease=t=>{t=P.clamp(t,0,1);return t*t*(3-2*t);};
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const mul=(a,n)=>({x:a.x*n,y:a.y*n,z:a.z*n});
  const sub=(a,b)=>add(a,mul(b,-1));
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const unit=a=>mul(a,1/Math.max(.00001,Math.hypot(a.x,a.y,a.z)));
  const mix=(a,b,t)=>add(a,mul(sub(b,a),t));
  // A shallow rear camera: forward movement has depth, raised joints have height.
  const project=p=>({x:p.x+.16*p.z,y:-p.y-.35*p.z,depth:p.z});
  function sample(points,t){
    let i=0;while(i<points.length-2&&t>points[i+1][0])i++;
    const span=points[i+1][0]-points[i][0],f=P.clamp((t-points[i][0])/span,0,1);
    const slope=(n,j)=>{
      if(n===0||n===points.length-1)return 0;
      const before=(points[n][j]-points[n-1][j])/(points[n][0]-points[n-1][0]);
      const after=(points[n+1][j]-points[n][j])/(points[n+1][0]-points[n][0]);
      return before*after<=0?0:2*before*after/(before+after);
    };
    // Continuous velocity through contact; stop only at a change of direction.
    return points[i].slice(1).map((v,j)=>(2*f**3-3*f*f+1)*v+(f**3-2*f*f+f)*span*slope(i,j+1)+(-2*f**3+3*f*f)*points[i+1][j+1]+(f**3-f*f)*span*slope(i+1,j+1));
  }
  function joint(start,end,upper,lower,pole){
    const delta=sub(end,start),d=Math.max(.001,Math.hypot(delta.x,delta.y,delta.z)),axis=unit(delta);
    const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
    return add(add(start,mul(axis,along)),mul(unit(sub(pole,mul(axis,dot(pole,axis)))),bend));
  }
  function stride(from,to,t){
    t=P.clamp(t,0,1);const foot=mix(from,to,ease(t));foot.y+=7*Math.sin(Math.PI*t)**2;return foot;
  }
  function strikerMotion(g,clock=0,reduced=false){
    const at=g?.shot?.started??(g?.phase==='read'?g.phaseStart+g.readDuration:null),elapsed=at===null?-Infinity:g.time-at;
    const duration=g?.shot?.runUp??(g?.role==='keep'?g.readDuration:.22);
    const approach=at===null?0:P.clamp(1+elapsed/duration,0,1);
    const follow=P.clamp(elapsed/.48,0,1),slope=.48/.23;
    const kick=elapsed<=0?.5*P.clamp(1+elapsed/.23,0,1):.5+.5*((follow**3-2*follow*follow+follow)*slope-2*follow**3+3*follow*follow);
    return {kick,armKick:kick,approach,inMatch:!!g,time:g?g.time:clock,reduced,charging:!!g?.charging,power:g?.power||0,
      lean:g?.role==='keep'?(g.incoming?.hint.x<500?-.025:.025):0};
  }
  function strikerPlacement(scale=P.G.keeperScale*1.75){
    const contact=project({x:0,y:6,z:0});return {x:P.G.ballX-contact.x*scale,y:P.G.ballY-contact.y*scale,scale,contact};
  }
  function strikerPose(kick=0,motion={}){
    kick=P.clamp(kick,0,1);
    const u=P.clamp(motion.approach??(kick?1:0),0,1),inMatch=!!motion.inMatch,travel=inMatch?ease(u/.92):1;
    const running=Math.sin(Math.PI*u)**2*(1-ease(kick*2)),time=motion.time||0;
    const idle=!motion.reduced&&u===0&&kick===0?Math.sin(time*2)*.18:0;
    const left=inMatch?stride({x:-36,y:4.5,z:-54},{x:-20,y:4.5,z:-2},(u-.35)/.47):{x:-20,y:4.5,z:-2};
    let right=inMatch?stride({x:-20,y:4.5,z:-65},{x:-12,y:4.5,z:-30},(u-.025)/.325):{x:-2,y:4.5,z:-6};
    let pitch=0;
    if(kick>0){
      const [x,y,z,p]=sample([[0,-12,4.5,-30,0],[.23,-1,34,-34,-.6],[.5,-2,5,-6,0],[.72,-4,22,36,.2],[1,2,4.5,34,0]],kick);
      right={x,y,z};pitch=p;
    }
    const [shift,lift,forward,yaw,roll]=sample([[0,0,0,.07,-.12,0],[.23,-1,-2,.14,-.3,-.025],[.5,-1,-1,.3,.08,-.14],[.72,0,0,.24,.32,-.06],[1,13,0,.1,.12,0]],kick);
    const pelvis={x:-28+7*travel+shift,y:54+lift+idle+running*.7*Math.cos(u*Math.PI*4),z:-58+50*travel+sample([[0,0],[.72,0],[1,22]],kick)[0]};
    const hipYaw=yaw*.4,hipSide={x:Math.cos(hipYaw),y:0,z:-Math.sin(hipYaw)};
    // Lower the hips slightly if necessary instead of stretching a planted leg.
    for(const [side,foot]of [[-1,left],[1,right]]){
      const hip=add(pelvis,mul(hipSide,side*7.5)),horizontal=(foot.x-hip.x)**2+(foot.z-hip.z)**2;
      pelvis.y=Math.min(pelvis.y,foot.y+Math.sqrt(Math.max(0,56.7**2-horizontal)));
    }
    const lean=forward+running*.09+(motion.charging ? .015*motion.power : 0);
    const up=unit({x:roll+(motion.lean||0),y:Math.cos(lean),z:Math.sin(lean)}),across={x:Math.cos(yaw),y:0,z:-Math.sin(yaw)};
    const centre=add(pelvis,mul(up,16)),map=(x,y)=>add(centre,add(mul(across,x),mul(up,-y)));
    const b=project(centre),bx=project(across),by=project(mul(up,-1));
    const body={...b,angle:Math.atan2(by.x,by.y),matrix:[bx.x,bx.y,by.x,by.y,b.x,b.y],yaw};
    const legs3=[[-1,left,0],[1,right,pitch]].map(([side,foot,pitch])=>{
      const hip=add(pelvis,mul(hipSide,side*7.5)),knee=joint(hip,foot,29,28,{x:0,y:0,z:1});
      return {side,hip,knee,foot,pitch,planted:side<0?(!inMatch||u>=.82):kick===0&&u>=.35};
    });
    const arms3=[-1,1].map(side=>{
      const [abduct,swing,foreAbduct,flex]=sample(side<0?
        [[0,.12,0,.12,.65],[.23,.82,.2,.7,.45],[.5,.88,.05,.68,.3],[.76,-.12,.65,-.85,.6],[1,.14,.1,.12,.5]]:
        [[0,.12,0,.12,.65],[.23,.22,-.65,.16,.5],[.5,.3,-.45,.12,.65],[.76,.15,.4,.2,.7],[1,.14,-.1,.12,.5]],kick);
      const strideSwing=-side*Math.sin(u*Math.PI*2)*running*.6,beta=swing+strideSwing;
      const upper=unit({x:side*Math.sin(abduct),y:-Math.cos(abduct)*Math.cos(beta),z:Math.cos(abduct)*Math.sin(beta)});
      const lower=unit({x:side*Math.sin(foreAbduct),y:-Math.cos(foreAbduct)*Math.cos(beta+flex),z:Math.cos(foreAbduct)*Math.sin(beta+flex)});
      const rotate=v=>({x:v.x*Math.cos(yaw)+v.z*Math.sin(yaw),y:v.y,z:-v.x*Math.sin(yaw)+v.z*Math.cos(yaw)});
      const shoulder=map(side*13,-11.5),elbow=add(shoulder,mul(rotate(upper),17)),hand=add(elbow,mul(rotate(lower),16));
      return {side,shoulder,elbow,hand,behind:hand.z>shoulder.z+1};
    });
    const legs=legs3.map(l=>({...l,hip:project(l.hip),knee:project(l.knee),foot:{...project(l.foot),pitch:l.pitch},world:l}));
    const arms=arms3.map(a=>({...a,shoulder:project(a.shoulder),elbow:project(a.elbow),hand:project(a.hand)}));
    const contact=project(add(right,{x:2,y:1,z:6}));
    return {body,legs,arms,head:project(map(0,-31)),headAngle:-body.angle*.35,shadow:project({x:pelvis.x,y:0,z:pelvis.z}),contact,
      rig:{legs:legs3,arms:arms3,pelvis},project};
  }
  const celebrationNames=Object.freeze(['Captain salute','Fist pumps','Aeroplane','Knee slide','Heart to the crowd','Keeper roar','The archer','Overhead applause','Heel-toe dance','Point to the sky']);
  function celebrationPose(id,time){
    const routine=((id%10)+10)%10,t=Math.max(0,time),enter=ease(t/.32),pulse=Math.sin(t*7),p={name:celebrationNames[routine],x:0,y:0,angle:0,headAngle:0,hands:[{x:-23,y:-53},{x:23,y:-53}],legs:[-1,1].map(side=>({side,hip:{x:side*8,y:-46},knee:{x:side*11,y:-25},foot:{x:side*15,y:-4}}))};
    const hands=(left,right)=>{p.hands=[{x:left[0],y:left[1]},{x:right[0],y:right[1]}];};
    if(routine===0){hands([-18,-47],[7,-104]);p.headAngle=-.07;p.angle=-.025;}
    if(routine===1){hands([-22,-96-pulse*9],[22,-96-pulse*9]);p.y=-Math.abs(pulse)*3;}
    if(routine===2){hands([-53,-80],[53,-80]);p.x=Math.sin(t*2)*12;p.angle=Math.sin(t*2)*.09;p.legs[1].foot.y-=Math.max(0,Math.sin(t*5))*9;}
    if(routine===3){hands([-40,-88],[40,-88]);p.x=45*ease(t/.8);p.y=15;p.angle=-.08;p.legs.forEach(l=>{l.knee={x:l.side*12,y:-16};l.foot={x:l.side*23,y:-15};});}
    if(routine===4){hands([-3,-76],[3,-76]);p.headAngle=.08;p.angle=Math.sin(t*2)*.025;}
    if(routine===5){hands([-32,-105],[32,-105]);p.legs.forEach(l=>{l.knee.x=l.side*16;l.foot.x=l.side*23;});p.angle=.025;p.headAngle=-.06;}
    if(routine===6){hands([-52,-84],[9,-89]);p.angle=.08;p.headAngle=-.16;p.x=-5;}
    if(routine===7){const clap=3+Math.abs(Math.sin(t*8))*10;hands([-clap,-118],[clap,-118]);p.headAngle=.09;}
    if(routine===8){hands([-12-pulse*7,-65],[18-pulse*7,-62]);p.x=Math.sin(t*5)*7;p.angle=pulse*.06;p.legs.forEach(l=>{l.knee.x+=l.side*Math.sin(t*5)*5;l.foot.x+=Math.sin(t*5)*7;l.foot.y-=Math.max(0,Math.sin(t*5+l.side*Math.PI/2))*9;});}
    if(routine===9){hands([-29,-59],[20,-119]);p.legs[1].knee={x:18,y:-39};p.legs[1].foot={x:23,y:-23};p.angle=-.04;p.headAngle=.12;}
    p.x*=enter;p.y*=enter;p.angle*=enter;p.headAngle*=enter;
    p.arms=p.hands.map((target,i)=>{
      const side=i?1:-1,shoulder={x:side*15,y:-81};
      const solve=hand=>{
        const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,distance=Math.max(1,Math.hypot(dx,dy)),length=Math.min(39.5,distance),ux=dx/distance,uy=dy/distance;
        const tip={x:shoulder.x+ux*length,y:shoulder.y+uy*length},bend=Math.sqrt(Math.max(0,400-length*length/4))*side*(dy<0?1:-1);
        const elbow={x:(shoulder.x+tip.x)/2-uy*bend,y:(shoulder.y+tip.y)/2+ux*bend};
        return [Math.atan2(elbow.y-shoulder.y,elbow.x-shoulder.x),Math.atan2(tip.y-elbow.y,tip.x-elbow.x)];
      };
      const rest=solve({x:side*23,y:-53}),end=solve(target),angles=rest.map((a,i)=>a+Math.atan2(Math.sin(end[i]-a),Math.cos(end[i]-a))*enter);
      const elbow={x:shoulder.x+20*Math.cos(angles[0]),y:shoulder.y+20*Math.sin(angles[0])},hand={x:elbow.x+20*Math.cos(angles[1]),y:elbow.y+20*Math.sin(angles[1])};
      return {side,shoulder,hand,elbow};
    });
    p.legs.forEach(l=>{l.knee.x=l.side*11+(l.knee.x-l.side*11)*enter;l.knee.y=-25+(l.knee.y+25)*enter;l.foot.x=l.side*15+(l.foot.x-l.side*15)*enter;l.foot.y=-4+(l.foot.y+4)*enter;});
    return p;
  }
  const api={strikerMotion,strikerPlacement,strikerPose,celebrationNames,celebrationPose};Object.assign(root.Panic||={},api);
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
