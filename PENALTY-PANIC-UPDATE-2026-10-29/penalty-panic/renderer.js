(function(root){
  'use strict';
  const P=root.Panic,G=P.G;
  const item=(save,category)=>P.items.find(i=>i.id===save.equipped[category]);
  function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function smoothPath(c,points,fill,stroke,width=1){
    const last=points.at(-1),first=points[0];c.beginPath();c.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
    points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length];c.quadraticCurveTo(x,y,(x+next[0])/2,(y+next[1])/2);});
    c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function curve(c,x,y,cx,cy,ex,ey,color,width=1){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(cx,cy,ex,ey);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
  function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
  function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fill();}
  function label(c,text,x,y,size=12,color='#fff'){c.fillStyle=color;c.font=`800 ${size}px Arial`;c.textAlign='center';c.fillText(text,x,y);}
  function softShadow(c,x,y,rx,ry,opacity=.18){
    c.save();c.translate(x,y);c.scale(rx*1.4,ry*1.4);
    const shade=c.createRadialGradient(0,0,0,0,0,1);
    shade.addColorStop(0,`rgba(5,22,24,${opacity})`);shade.addColorStop(.45,`rgba(5,22,24,${opacity*.58})`);shade.addColorStop(1,'#05161800');
    ellipse(c,0,0,1,1,shade);c.restore();
  }
  function limb(c,x1,y1,x2,y2,width1,width2,color){
    const length=Math.max(1,Math.hypot(x2-x1,y2-y1)),r1=width1/2,r2=width2/2;
    c.save();c.translate(x1,y1);c.rotate(Math.atan2(y2-y1,x2-x1)-Math.PI/2);
    c.beginPath();c.moveTo(-r1,0);c.quadraticCurveTo(-r1,-r1,0,-r1);c.quadraticCurveTo(r1,-r1,r1,0);
    const middle=(r1+r2)*.53;
    c.quadraticCurveTo(r1*1.06,length*.23,middle,length*.5);c.quadraticCurveTo(r2*1.12,length*.8,r2,length);c.quadraticCurveTo(r2,length+r2,0,length+r2);
    c.quadraticCurveTo(-r2,length+r2,-r2,length);c.quadraticCurveTo(-r2*1.12,length*.8,-middle,length*.5);c.quadraticCurveTo(-r1*1.06,length*.23,-r1,0);c.closePath();
    c.fillStyle=color;c.fill();
    const shade=c.createLinearGradient(-r1,0,r1,0);shade.addColorStop(0,'#071a342b');shade.addColorStop(.35,'#ffffff18');shade.addColorStop(.65,'#ffffff05');shade.addColorStop(1,'#071a3438');
    c.fillStyle=shade;c.fill();c.restore();
  }
  function head(c,x,y,back=false,headband=null,look={},id=0){
    const girl=look.gender==='girls',style=id%5,skin=look.skin||'#d0a07d',jaw=girl?4:5;
    const outline=[[x-6,y-9],[x-9,y-4],[x-8,y+4],[x-jaw,y+9],[x,y+11],[x+jaw,y+9],[x+8,y+4],[x+9,y-4],[x+6,y-9]];
    const hairColor=look.hair||['#302c28','#453126','#513b2c','#23282b','#644b32'][style];
    const hair=c.createLinearGradient(x-6,y-11,x+8,y+5);hair.addColorStop(0,hairColor);hair.addColorStop(.55,hairColor);hair.addColorStop(1,'#192025');
    // Tied hair sits behind the face and follows the head's existing animation.
    if(girl){
      if(style===0){ellipse(c,x+9,y-1,5.2,5.3,hair);curve(c,x+7,y-4,x+14,y-3,x+10,y+3,'#c7b59b35',.7);}
      else if(style===4)smoothPath(c,[[x-8,y-8],[x-11,y-1],[x-10,y+10],[x-6,y+13],[x-6,y+2],[x+6,y+2],[x+7,y+13],[x+11,y+10],[x+11,y-2],[x+8,y-9]],hair);
      else{
        const lift=style===3?-5:0;
        smoothPath(c,[[x+5,y-6+lift],[x+11,y-7+lift],[x+15,y-1],[x+14,y+10],[x+11,y+20],[x+9,y+17],[x+10,y+6],[x+7,y+1]],hair);
        if(style===2)for(let i=0;i<5;i++)curve(c,x+10,y+i*3,x+15,y+2+i*3,x+11,y+4+i*3,'#ad967c38',.8);
        else curve(c,x+11,y-2,x+14,y+7,x+11,y+16,'#ad967c30',.8);
        line(c,x+7,y-4+lift,x+11,y-5+lift,headband?.variant?headband.color:'#8c9c8b',1.4);
      }
    }
    ellipse(c,x-8,y+1,1.7,2.8,skin);ellipse(c,x+8,y+1,1.7,2.8,skin);smoothPath(c,outline,skin);
    const light=c.createLinearGradient(x-8,y-5,x+9,y+6);light.addColorStop(0,'#ffffff28');light.addColorStop(.55,'#ffffff00');light.addColorStop(1,'#32221c42');smoothPath(c,outline,light);
    if(back){smoothPath(c,[[x-9,y],[x-9,y-7],[x-5,y-12],[x+2,y-13],[x+8,y-9],[x+9,y-2],[x+7,y+4],[x+3,y+6],[x-5,y+5]],hair);}
    else{
      smoothPath(c,girl?[[x-9,y+3],[x-10,y-4],[x-6,y-11],[x+2,y-13],[x+8,y-10],[x+10,y-4],[x+8,y+3],[x+6,y-2],[x+3,y-7],[x-2,y-4],[x-6,y-2]]:[[x-9,y],[x-9,y-8],[x-5,y-12],[x+3,y-13],[x+8,y-8],[x+9,y],[x+5,y-6],[x-1,y-5],[x-6,y-5]],hair);
      curve(c,x-5,y-1,x-3.5,y-2,x-2,y-1,hairColor,girl?.65:.8);curve(c,x+2,y-1,x+3.5,y-2,x+5,y-1,hairColor,girl?.65:.8);
      ellipse(c,x-3.5,y, .6,.7,'#3a3832');ellipse(c,x+3.5,y,.6,.7,'#3a3832');
      curve(c,x+1,y+1,x-1,y+4,x+1,y+4,'#a17455',.65);curve(c,x-2,y+6,x,y+7,x+2,y+6,'#93694f',.7);
    }
    for(let i=0;i<3;i++)curve(c,x-6+i*3,y-6,x-5+i*3,y-10,x+1+i*2,y-10,'#89938b18',.7);
    if(headband?.variant){
      const bandY=y+(back?3:-4);curve(c,x-8,bandY,x,bandY+2,x+8,bandY,headband.color,3.2);
      if(headband.variant>1)curve(c,x-7.7,bandY,x,bandY+2,x+7.7,bandY,headband.variant===2?'#dbe8e8':'#28394b',.8);
      if(back){curve(c,x-7,bandY,x-10,bandY+4,x-9,bandY+7,headband.color,1.8);curve(c,x-7,bandY,x-11,bandY+2,x-11,bandY+5,headband.color,1.8);}
    }
  }
  function accessoryBand(c,from,to,width,wear,t=.8,caption=false){
    if(!wear?.variant)return;
    const x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,angle=Math.atan2(to.y-from.y,to.x-from.x),scale=width/(caption?8.5:6.5),length=(caption?6:3.4)*scale;
    c.save();c.translate(x,y);c.rotate(angle);
    smoothPath(c,[[-length/2,-width/2],[length/2,-width/2],[length/2,width/2],[-length/2,width/2]],wear.color);
    if(wear.variant>1&&!caption)line(c,0,-width*.43,0,width*.43,'#ffffff80',.65);
    if(caption){c.rotate(-angle);label(c,'C',0,1.8*scale,4.4*scale,ink(wear.color));}c.restore();
  }
  function sockBands(c,knee,foot,wear,width){
    accessoryBand(c,knee,foot,width,wear,.58);
    if(wear?.variant>1)accessoryBand(c,knee,foot,width,wear,.78);
  }
  function drawHand(c,x,y,side,angle){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(side,1);
    const skin=c.createLinearGradient(-4,0,3,0);skin.addColorStop(0,'#b88768');skin.addColorStop(.5,'#d3a17c');skin.addColorStop(1,'#bd8a69');
    smoothPath(c,[[-2,-4],[2,-4],[3,-1],[3,3],[1.5,5],[-1,5],[-2,3],[-3,0],[-4,1],[-4,-1]],skin);
    curve(c,-1,1,0,2,0,4,'#885d432e',.6);c.restore();
  }
  function boot(c,x,y,side,color){
    c.save();c.translate(x,y);c.scale(side,1);
    const outline=[[-4,-3],[1,-4],[4,-3],[6,-1],[12,0],[13,3],[10,4],[-4,4]];
    smoothPath(c,outline,color,'#081e2c66',.6);
    const shine=c.createLinearGradient(0,-3,0,4);shine.addColorStop(0,'#ffffff25');shine.addColorStop(1,'#081e2c25');smoothPath(c,outline,shine);
    curve(c,-3,3,4,4,11,3,'#c5d0c9',.9);curve(c,1,-2,2,-.5,4,-1,'#e8ede48c',.7);curve(c,3,-1,4,.5,6,0,'#e8ede48c',.7);c.restore();
  }
  function kit(c,x,y,color,variant,width=36,height=45,design=null){
    const outline=[[x-width*.3,y-height*.48],[x-width*.16,y-height*.55],[x+width*.16,y-height*.55],[x+width*.3,y-height*.48],[x+width*.48,y-height*.34],[x+width*.43,y-height*.08],[x+width*.36,y+height*.2],[x+width*.38,y+height*.43],[x+width*.29,y+height*.5],[x,y+height*.52],[x-width*.29,y+height*.5],[x-width*.38,y+height*.43],[x-width*.36,y+height*.2],[x-width*.43,y-height*.08],[x-width*.48,y-height*.34]];
    smoothPath(c,outline,color);
    c.save();c.clip();
    if(design){
      const left=x-width*.34,right=x+width*.34,top=y-height*.4,bottom=y+height*.44,accent=design.secondary;
      if(design.pattern==='stripes')for(const dx of [-.22,0,.22]){
        const sx=x+width*dx,half=width*.055;c.beginPath();c.moveTo(sx-half,top);c.quadraticCurveTo(sx-half-1,y,sx-half,bottom);c.lineTo(sx+half,bottom);c.quadraticCurveTo(sx+half-1,y,sx+half,top);c.closePath();c.fillStyle=accent;c.fill();
      }
      if(design.pattern==='hoops')for(const dy of [-.25,0,.25]){
        const sy=y+height*dy;c.beginPath();c.moveTo(left,sy);c.quadraticCurveTo(x,sy+2,right,sy);c.lineTo(right,sy+height*.10);c.quadraticCurveTo(x,sy+height*.10+2,left,sy+height*.10);c.closePath();c.fillStyle=accent;c.fill();
      }
      if(design.pattern==='sash')path(c,[[left,top],[left+width*.18,top],[right,bottom-height*.18],[right,bottom],[right-width*.09,bottom],[left,top+height*.18]],accent);
      if(design.pattern==='halves')path(c,[[x,top],[right,top],[right,bottom],[x,bottom]],accent);
    }else if(variant===2)for(const dx of [-10,0,10])line(c,x+dx,y-height*.42,x+dx,y+height*.42,'#122940',4);
    else line(c,x,y-height*.42,x,y+height*.42,'#ffffff88',variant===1?5:2);
    const shade=c.createLinearGradient(x-width/2,y,x+width/2,y+height*.3);
    shade.addColorStop(0,'#071c302e');shade.addColorStop(.28,'#ffffff20');shade.addColorStop(.6,'#ffffff04');shade.addColorStop(1,'#071c3055');
    smoothPath(c,outline,shade);
    const light=c.createRadialGradient(x-width*.18,y-height*.21,1,x-width*.12,y-height*.06,height*.68);light.addColorStop(0,'#ffffff16');light.addColorStop(.6,'#ffffff04');light.addColorStop(1,'#071c301a');smoothPath(c,outline,light);
    c.restore();
    curve(c,x-7,y-height/2+1,x,y-height/2+9,x+7,y-height/2+1,'#152c3a77',2.7);
    curve(c,x-6.5,y-height/2+1,x,y-height/2+7.5,x+6.5,y-height/2+1,design?.secondary||'#e0e8e68c',1.4);
    curve(c,x-width*.3,y+1,x-width*.32,y+height*.17,x-width*.23,y+height*.35,'#071c3028',1);
    curve(c,x+width*.24,y+height*.1,x+width*.11,y+height*.24,x+width*.18,y+height*.39,'#071c3020',1);
    curve(c,x-width*.27,y+height*.45,x,y+height*.5,x+width*.27,y+height*.45,'#ffffff22',.7);
  }
  function shirtText(c,text,x,y,size,color){
    const outline=color==='#142532'?'#f5f6efcc':'#142532b0';
    for(const [dx,dy]of [[-.3,0],[.3,0],[0,-.3],[0,.3]])label(c,text,x+dx,y+dy,size,outline);
    label(c,text,x,y,size,color);
  }
  function ink(color){const rgb=color.slice(1).match(/../g).map(x=>parseInt(x,16));return rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>158?'#142532':'#f5f6ef';}
  function crest(c,x,y,size,club){
    c.save();c.translate(x,y);c.scale(size/40,size/40);
    const a=club.home.primary,b=club.home.secondary;
    if(club.crest==='round'){ellipse(c,0,0,20,20,b);ellipse(c,0,0,17,17,a);}
    else path(c,club.crest==='diamond'?[[0,-22],[20,0],[0,23],[-20,0]]:[[-19,-17],[0,-22],[19,-17],[17,9],[0,23],[-17,9]],a,b,2.5);
    line(c,-9,10,9,10,b,2);shirtText(c,club.shortName,0,4,club.shortName.length>3?9:11,ink(a));c.restore();
  }
  function ball(c,x,y,r,skin,spin=0){
    c.save();c.translate(x,y);c.rotate(spin);ellipse(c,0,0,r,r,skin.color);
    const panel=skin.variant===2?'#184958':'#24303b';
    path(c,Array.from({length:5},(_,i)=>[Math.cos(i*1.256-.3)*r*.35,Math.sin(i*1.256-.3)*r*.35]),panel);
    for(let i=0;i<5;i++){
      const a=i*1.256-.3,x=Math.cos(a)*r*.73,y=Math.sin(a)*r*.73;
      path(c,Array.from({length:5},(_,j)=>[x+Math.cos(a+j*1.256)*r*.19,y+Math.sin(a+j*1.256)*r*.19]),panel);
      line(c,Math.cos(a)*r*.34,Math.sin(a)*r*.34,x,y,'#54636e88',Math.max(.5,r*.035));
      const b=a+1.256;line(c,x,y,Math.cos(b)*r*.73,Math.sin(b)*r*.73,'#65747a55',Math.max(.45,r*.025));
    }
    c.restore();
    // Lighting stays fixed under the stadium lamps while the panels rotate.
    const shade=c.createRadialGradient(x-r*.35,y-r*.45,r*.15,x,y,r*1.12);
    shade.addColorStop(0,'#ffffff40');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(1,'#071a3355');
    ellipse(c,x,y,r,r,shade);ellipse(c,x-r*.32,y-r*.42,r*.15,r*.09,'#ffffff70');
  }
  function trophy(c,x,y,scale=1){
    c.save();c.translate(x,y);c.scale(scale,scale);
    softShadow(c,0,7,54,9,.35);
    const metal=c.createLinearGradient(-40,-120,42,-100);
    metal.addColorStop(0,'#aa8341');metal.addColorStop(.32,'#fff1b5');metal.addColorStop(.62,'#d7b56c');metal.addColorStop(.84,'#f8e5a5');metal.addColorStop(1,'#94723c');
    curve(c,-34,-143,-87,-150,-56,-95,metal,7);curve(c,-56,-95,-48,-82,-23,-82,metal,7);
    curve(c,34,-143,87,-150,56,-95,metal,7);curve(c,56,-95,48,-82,23,-82,metal,7);
    smoothPath(c,[[-41,-154],[41,-154],[35,-103],[27,-82],[8,-68],[6,-35],[24,-22],[-24,-22],[-6,-35],[-8,-68],[-27,-82],[-35,-103]],metal);
    ellipse(c,0,-153,40,5,'#ffefb5');ellipse(c,0,-153,33,2.8,'#8b6c3b');
    curve(c,-24,-141,-24,-106,-14,-92,'#fff6d7a6',3);
    smoothPath(c,[[-26,-24],[26,-24],[33,-5],[-33,-5]],metal);
    smoothPath(c,[[-37,-5],[37,-5],[37,7],[-37,7]],'#1b3354','#d1b570',1);
    path(c,[[0,-128],[6,-117],[18,-112],[6,-107],[0,-96],[-6,-107],[-18,-112],[-6,-117]],'#233b62');
    label(c,'CHAMPIONS',0,3,5,'#edd99e');c.restore();
  }
  function glove(c,x,y,color,angle=0,handedness=1,size=1){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(handedness*size,size);
    // A cupped padded glove: close fingers, shallow tip divisions, tucked thumb.
    c.beginPath();c.moveTo(-4.5,9);c.quadraticCurveTo(-7,5,-7.3,0);c.lineTo(-7.8,-6.4);
    c.quadraticCurveTo(-8,-8.7,-6.4,-9.3);c.quadraticCurveTo(-5.4,-9.6,-4.6,-8.8);
    c.lineTo(-4.8,-10.2);c.quadraticCurveTo(-4.7,-12.1,-3.1,-12.3);c.quadraticCurveTo(-1.7,-12.4,-1.1,-11.2);
    c.quadraticCurveTo(-.7,-13.2,1,-13.2);c.quadraticCurveTo(2.6,-13.1,2.9,-11.1);
    c.quadraticCurveTo(3.8,-12,5,-10.9);c.quadraticCurveTo(6,-9.6,5.8,-7.4);c.lineTo(5.6,-1.6);
    c.quadraticCurveTo(6.8,-3.9,8.4,-3.7);c.quadraticCurveTo(10.2,-3.4,9.7,-1.4);c.lineTo(8.5,3.2);
    c.quadraticCurveTo(7.6,5.6,5,7.7);c.lineTo(4.5,9);c.closePath();
    c.fillStyle=color;c.fill();c.strokeStyle='#172c3d80';c.lineWidth=.65;c.lineJoin='round';c.stroke();
    // Light latex contacts the ball; the coloured shell and strap retain the skin.
    for(const [fx,top,base,width] of [[-6,-6.5,-5.4,2.5],[-3.1,-9.3,-2.8,2.8],[.3,-10.1,.4,2.8],[3.5,-8.6,3.1,2.6]])line(c,fx,top,base,-.8,'#e8ece2',width);
    c.beginPath();c.moveTo(-5.7,-1);c.quadraticCurveTo(-.8,-2,4,-1);c.quadraticCurveTo(5.9,2.7,2.8,6.6);
    c.quadraticCurveTo(-.5,8,-3.9,5.8);c.quadraticCurveTo(-5.7,3,-5.7,-1);c.closePath();c.fillStyle='#e8ece2';c.fill();
    line(c,7.5,-1.3,6,3.1,'#e8ece2',2.8);
    line(c,-4,1.5,-1.8,2.2,'#60756d33',.55);line(c,2.2,1.6,3.4,.8,'#60756d33',.55);
    smoothPath(c,[[-4.8,8],[4.8,8],[4.3,12],[-4.3,12]],'#213744','#152c3880',.6);
    smoothPath(c,[[-4.1,8.9],[4.1,8.9],[3.8,11.1],[-3.8,11.1]],color);
    line(c,-2.5,10,1,10,'#ffffffb0',.75);c.restore();
  }
  function keeper(c,pose,appearance){
    const b=pose.body,skin='#dba887',bodyScale=b.scale||1;
    softShadow(c,b.x+5,pose.groundY??b.y+49*bodyScale,(35+Math.abs(pose.angle)*12)*bodyScale,7,.17);
    const side=Math.sign(pose.angle),leg=pose.progress||0,landing=pose.landing||0;
    const angle=pose.angle||0,rotate=(x,y)=>({x:b.x+(x*Math.cos(angle)-y*Math.sin(angle))*bodyScale,y:b.y+(x*Math.sin(angle)+y*Math.cos(angle))*bodyScale});
    c.save();c.translate(b.x,b.y);c.rotate(angle);c.scale(bodyScale,bodyScale);
    const tuck=Math.sin(leg*Math.PI)*.7+landing*.3;
    for(const sign of [-1,1]){
      const hip={x:sign*9,y:21},knee={x:sign*(20-leg*8)-side*tuck*8,y:34+leg*3-tuck*4},foot={x:sign*(24-leg*17)+side*tuck*14,y:49-tuck*10};
      limb(c,hip.x,hip.y,knee.x,knee.y,11,9,'#1b303c');limb(c,knee.x,knee.y,foot.x,foot.y,8,5,'#243d49');
      sockBands(c,knee,foot,appearance.sockTape,6.5);
      boot(c,foot.x,foot.y,sign,appearance.boots);
    }
    kit(c,0,0,appearance.kit,appearance.variant,36,49,appearance.design);
    shirtText(c,appearance.number??'1',0,10,14,ink(appearance.kit));if(appearance.club)crest(c,8,-13,6,appearance.club);c.restore();
    // Two jointed arm segments follow the reach instead of rigid stick arms.
    // Visible palms stay centred on the collision circles throughout the dip.
    pose.hands.forEach((h,i)=>{
      const size=h.r/15*.86*bodyScale,sign=i?1:-1;
      let restAngle=sign*2.8;
      // Keep rotation on the same arc when a left or right dive begins.
      if(side&&Math.sign(restAngle)!==side)restAngle+=side*Math.PI*2;
      const wristAngle=angle+restAngle*(1-leg)**2;
      const wrist={x:h.x-Math.sin(wristAngle)*11*size,y:h.y+Math.cos(wristAngle)*11*size};
      const shoulder=rotate(sign*16,-13),dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,length=Math.max(1,Math.hypot(dx,dy));
      const bend=Math.sqrt(Math.max(0,(18*bodyScale)**2-length*length/4))*sign;
      const extended={x:(shoulder.x+wrist.x)/2-dy/length*bend,y:(shoulder.y+wrist.y)/2+dx/length*bend};
      const relaxed=rotate(sign*24,3),elbow={x:relaxed.x+(extended.x-relaxed.x)*leg,y:relaxed.y+(extended.y-relaxed.y)*leg};
      limb(c,shoulder.x,shoulder.y,elbow.x,elbow.y,10*bodyScale,8*bodyScale,appearance.kit);limb(c,elbow.x,elbow.y,wrist.x,wrist.y,8*bodyScale,5.5*bodyScale,appearance.kit);
      accessoryBand(c,elbow,wrist,6.5*bodyScale,appearance.wristTape,.45);
      if(!i)accessoryBand(c,shoulder,elbow,9*bodyScale,appearance.armband,.6,true);
      glove(c,h.x,h.y,appearance.gloves,wristAngle,i?-1:1,size);
    });
    // The far arm passes behind the head during an overhead reach.
    c.save();c.translate(b.x,b.y);c.rotate(angle);c.scale(bodyScale,bodyScale);line(c,0,-25,0,-32,skin,8);
    head(c,0,-40,false,appearance.headband,{...appearance,skin});c.restore();
  }
  const {strikerMotion,strikerPose,strikerPlacement}=P;
  function strikerBoot(c,leg,color,project){
    const f=leg.world.foot,pitch=leg.world.pitch;
    const point=([x,y,z])=>{const p=project({x:f.x+x,y:f.y+y*Math.cos(pitch)+z*Math.sin(pitch),z:f.z+z*Math.cos(pitch)-y*Math.sin(pitch)});return [p.x,p.y];};
    const sole=[[-3,-4,-4],[3,-4,-4],[3,-4,6],[1.7,-4,9],[-1.7,-4,9],[-3,-4,6]].map(point);
    const upper=[[-2.8,1,-3],[2.8,1,-3],[3,-1.5,5],[1.7,-2.5,8],[-1.7,-2.5,8],[-3,-1.5,5]].map(point);
    smoothPath(c,sole,'#18252b');
    smoothPath(c,[sole[0],sole[1],upper[1],upper[0]],color);
    smoothPath(c,[sole[1],sole[2],sole[3],upper[3],upper[2],upper[1]],color);
    smoothPath(c,upper,color,'#061b2c70',.5);
    const shine=c.createLinearGradient(upper[0][0],upper[0][1],upper[2][0],upper[2][1]);shine.addColorStop(0,'#ffffff30');shine.addColorStop(1,'#071b2d30');smoothPath(c,upper,shine);
    line(c,...sole[0],...sole[1],'#cbd6c6',.65);
    for(const z of [0,2,4])line(c,...point([-1.5,1-z*.35,z]),...point([1.5,1-z*.35,z]),'#d5ded380',.5);
  }
  function shortsLeg(c,hip,knee,color){
    const length=Math.hypot(knee.x-hip.x,knee.y-hip.y)*.86;
    c.save();c.translate(hip.x,hip.y);c.rotate(Math.atan2(knee.y-hip.y,knee.x-hip.x)-Math.PI/2);
    c.beginPath();c.moveTo(-6.8,-3);c.quadraticCurveTo(0,-4,6.8,-3);
    c.quadraticCurveTo(8.2,length*.25,7.4,length*.72);c.quadraticCurveTo(7.4,length+.4,6.6,length+.6);
    c.quadraticCurveTo(0,length+2,-6.6,length+.6);c.quadraticCurveTo(-7.4,length+.4,-7.4,length*.72);
    c.quadraticCurveTo(-8.2,length*.25,-6.8,-3);c.closePath();c.fillStyle=color;c.fill();
    const shade=c.createLinearGradient(-8,0,8,0);shade.addColorStop(0,'#071c3038');shade.addColorStop(.4,'#ffffff16');shade.addColorStop(1,'#071c3038');c.fillStyle=shade;c.fill();
    curve(c,-6.2,length-.2,0,length+1.1,6.2,length-.2,'#ffffff26',.65);
    curve(c,5,-1,6,length*.4,5.8,length-2,'#071c3030',.7);c.restore();
  }
  function striker(c,x,y,appearance,kick=0,celebrate=0,variant=0,motion={}){
    c.save();c.translate(x,y);c.scale(appearance.scale||1,appearance.scale||1);
    const pose=strikerPose(kick,motion),body=pose.body,skin='#c99777';
    softShadow(c,pose.shadow.x,pose.shadow.y,17,4,.19);
    for(const leg of pose.rig.legs){const p=pose.project({...leg.foot,y:0});softShadow(c,p.x,p.y,4,2,.24/(1+leg.foot.y/8));}
    if(celebrate>0&&variant===1)c.scale(.3+.7*Math.abs(Math.cos(celebrate*6)),1);
    if(celebrate>0&&variant===2)c.translate(0,-Math.abs(Math.sin(celebrate*6))*15);
    for(const leg of [...pose.legs].sort((a,b)=>b.foot.depth-a.foot.depth)){
      const {hip,knee,foot}=leg;
      limb(c,hip.x,hip.y,knee.x,knee.y,10.5,8,skin);
      limb(c,knee.x,knee.y,foot.x,foot.y,7,4.5,skin);
      limb(c,knee.x+(foot.x-knee.x)*.23,knee.y+(foot.y-knee.y)*.23,foot.x,foot.y,8,4.5,appearance.design?.secondary||'#d6dfd7');
      shortsLeg(c,hip,knee,appearance.design?.primary||'#1d3443');
      sockBands(c,knee,foot,appearance.sockTape,6.3);strikerBoot(c,leg,appearance.boots,pose.project);
    }
    const blend=celebrate>0?P.clamp(celebrate/.18,0,1):0,raised=blend*blend*(3-2*blend);
    const bodyPoint=(x,y)=>({x:body.matrix[0]*x+body.matrix[2]*y+body.x,y:body.matrix[1]*x+body.matrix[3]*y+body.y});
    const arms=pose.arms.map(a=>{if(!raised)return a;const elbow=bodyPoint(a.side*22,-30),hand=bodyPoint(a.side*25,-46);return {...a,behind:false,elbow:{x:a.elbow.x+(elbow.x-a.elbow.x)*raised,y:a.elbow.y+(elbow.y-a.elbow.y)*raised},hand:{x:a.hand.x+(hand.x-a.hand.x)*raised,y:a.hand.y+(hand.y-a.hand.y)*raised}};});
    const drawArm=arm=>{
      const {side,shoulder,elbow,hand}=arm,under=appearance.sleeves?.variant?appearance.sleeves.color:skin;
      limb(c,shoulder.x,shoulder.y,elbow.x,elbow.y,7.5,6,under);limb(c,elbow.x,elbow.y,hand.x,hand.y,5.8,4,under);
      limb(c,shoulder.x,shoulder.y,shoulder.x+(elbow.x-shoulder.x)*.48,shoulder.y+(elbow.y-shoulder.y)*.48,8.5,7.5,appearance.kit);
      accessoryBand(c,elbow,hand,4.8,appearance.wristTape,.77);
      if(side<0)accessoryBand(c,shoulder,elbow,8.5,appearance.armband,.27,true);
      c.save();c.translate(hand.x,hand.y);c.scale(.78,.78);drawHand(c,0,0,side,Math.atan2(hand.y-elbow.y,hand.x-elbow.x)-Math.PI/2);c.restore();
    };
    arms.filter(a=>a.behind).forEach(drawArm);
    c.save();c.transform(...body.matrix);
    smoothPath(c,[[-12,13],[0,12],[12,13],[13,20],[11,25],[4,25],[0,22],[-4,25],[-11,25],[-13,20]],appearance.design?.primary||'#1d3443');
    kit(c,0,0,appearance.kit,appearance.variant,32,36,appearance.design);
    const name=appearance.shirtName||'PANIC',textColor=ink(appearance.kit);
    shirtText(c,name,0,-8,Math.min(4.5,35/Array.from(name).length),textColor);shirtText(c,appearance.number??'10',0,10,15,textColor);
    line(c,0,-18,0,-24,skin,6);c.restore();
    arms.filter(a=>!a.behind).forEach(drawArm);
    c.save();c.translate(pose.head.x,pose.head.y);c.rotate(pose.headAngle);c.scale(.85,.85);head(c,0,0,true,appearance.headband,{...appearance,skin},3);c.restore();
    c.restore();
  }
  function appearance(save,who,opponent){
    const gender=P.playerGender(save.club);
    if(opponent)return {gender,kit:opponent.color,variant:1,gloves:'#f4f5e9',boots:'#18283b',number:who==='keep'?'1':'9',shirtName:opponent.badge};
    const k=item(save,who==='keep'?'Keeper kit':'Player kit'),club=save.club||P.normalizeClub(),design=club.custom?club[who==='keep'?'keeper':club.activeKit]:k.design||null;
    return {gender,kit:design?.primary||k.color,variant:k.variant,gloves:item(save,'Gloves').color,boots:item(save,'Boots').color,design,club,number:who==='keep'?'1':String(club.number),shirtName:club.shirtName,headband:item(save,'Headband'),wristTape:item(save,'Wrist tape'),sleeves:item(save,'Undersleeves'),sockTape:item(save,'Sock tape'),armband:item(save,'Armband')};
  }
  function spectator(c,row,i,time,excited){
    const shirts=['#51636c','#283b48','#78918d','#9a6c5f','#a9a18c','#344b57','#536475'];
    const x=i*9-55+(row%2)*4+Math.sin(i*17+row)*1.2,y=87+row*19+26*(1-((x-500)/600)**2);
    const bob=Math.sin(time*(excited?7:1.5)+i)*(excited?1.7:.3);
    line(c,x,y+3+bob,x+.6,y+7+bob,shirts[(i*13+row*3)%shirts.length],3.5+row*.12);
    ellipse(c,x,y+bob,1.4+row*.04,1.7,['#a99881','#796955','#a08f78','#675e53'][(i*7+row)%4]);
  }
  function stadium(c,theme){
    const sky=c.createLinearGradient(0,0,0,300);
    sky.addColorStop(0,theme===1?'#3c344d':theme===2?'#103733':'#111f30');sky.addColorStop(1,theme===1?'#8d6e76':'#44606a');c.fillStyle=sky;c.fillRect(-800,-500,2600,1400);
    if(theme===2){const glow=c.createRadialGradient(480,30,5,480,30,480);glow.addColorStop(0,'#65d6ae30');glow.addColorStop(1,'#65d6ae00');c.fillStyle=glow;c.fillRect(0,0,1000,250);}
    c.beginPath();c.moveTo(-100,-20);c.lineTo(1100,-20);c.lineTo(1100,55);c.quadraticCurveTo(500,120,-100,55);c.closePath();c.fillStyle='#0c1822';c.fill();
    for(let i=0;i<=12;i++){const x=i*100-100;line(c,x,-5,500+(x-500)*1.12,74-Math.abs(x-500)*.035,'#31444d',2);}
    c.beginPath();c.moveTo(-100,49);c.quadraticCurveTo(500,106,1100,49);c.strokeStyle='#60717b';c.lineWidth=3;c.stroke();
    c.beginPath();c.moveTo(-100,55);c.quadraticCurveTo(500,112,1100,55);c.strokeStyle='#d9e9de45';c.lineWidth=1;c.stroke();
    for(let row=0;row<8;row++){
      c.beginPath();c.moveTo(-100,89+row*19);c.quadraticCurveTo(500,140+row*19,1100,89+row*19);c.strokeStyle=row%3===2?'#7c90904a':'#102333';c.lineWidth=row%3===2?3:15;c.stroke();
      for(let i=0;i<125;i++){
        if(row===7||(i+row*7)%9!==0)spectator(c,row,i,0,false);
      }
    }
    for(const x of [100,900]){
      const halo=c.createRadialGradient(x,51,2,x,51,130);halo.addColorStop(0,'#f1f8df60');halo.addColorStop(.25,'#dcefd024');halo.addColorStop(1,'#dcefd000');c.fillStyle=halo;c.fillRect(x-130,-70,260,260);
      smoothPath(c,[[x-45,41],[x+45,41],[x+48,55],[x-48,55]],'#263944','#71848c',1);
      for(let j=0;j<9;j++)for(let row=0;row<2;row++){c.fillStyle='#e8efdd';c.fillRect(x-39+j*9,44+row*5,6,3);}
      const beam=c.createLinearGradient(x,55,x,540);beam.addColorStop(0,'#eff8e314');beam.addColorStop(1,'#eff8e300');path(c,[[x-38,55],[x+38,55],[x+320,570],[x-320,570]],beam);
    }
    c.fillStyle='#0e222c';c.fillRect(-100,246,1200,23);line(c,-100,246,1100,246,'#91a6aa66',1);
    for(let i=0;i<6;i++){const x=i*190-70;c.fillStyle=i%2?'#d8dfca':'#19383e';c.fillRect(x,251,180,14);label(c,i%2?'PENALTY PANIC':'THE SPOT IS YOURS',x+90,261,8,i%2?'#263f3c':'#c6d8be');}
    const grass=c.createLinearGradient(0,269,0,700);grass.addColorStop(0,'#3a754c');grass.addColorStop(.5,'#32683f');grass.addColorStop(1,'#254d31');c.fillStyle=grass;c.fillRect(-800,269,2600,1000);
    const rows=[269,296,328,368,416,475,548,637,744];
    for(let i=0;i<rows.length-1;i++)if(i%2===0){c.fillStyle='#b8d7940b';c.fillRect(-800,rows[i],2600,rows[i+1]-rows[i]);}
    const light=c.createRadialGradient(500,390,20,500,390,560);light.addColorStop(0,'#c5dc9c16');light.addColorStop(1,'#102a2200');c.fillStyle=light;c.fillRect(0,269,1000,500);
    // Fine mowing lines and sidelight add depth without moving the aiming frame.
    for(let i=0;i<18;i++){const x=i*90-280;line(c,500+(x-500)*.35,269,x,700,'#d6e1b908',.8);}
    const edges=c.createLinearGradient(0,350,1000,350);edges.addColorStop(0,'#071b3040');edges.addColorStop(.2,'#071b3000');edges.addColorStop(.8,'#071b3000');edges.addColorStop(1,'#071b3040');c.fillStyle=edges;c.fillRect(0,269,1000,351);
    for(let i=0;i<340;i++){const x=i*79%1160-80,y=278+(i*97%430),depth=(y-269)/430;line(c,x,y,x+depth*1.8,y-1-depth*2.3,i%3?'#c6d7a719':'#0d341e22',.55+depth*.4);}
    // Both penalty areas are wider than the goal, extending beyond this camera.
    path(c,[[-260,350],[1260,350],[1510,445],[-510,445]],null,'#e0e7d9a0',1.6);
    path(c,[[-750,350],[1750,350],[2250,651],[-1250,651]],null,'#e0e7d9a0',2);
    line(c,-200,350,1200,350,'#e0e7d9a8',1.8);
    ellipse(c,500,515,12,3.3,'#1f482329');ellipse(c,500,515,3.5,1.8,'#e5e9d7');
  }
  class Renderer {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.view={scale:1,x:0,y:0};this.resize();}
    backdrop(theme,time,excited){
      const c=this.ctx,key=`${theme}:${this.dpr}`;
      if(root.document?.createElement){
        if(this.backgroundKey!==key){
          const layer=root.document.createElement('canvas');layer.width=1000*this.dpr;layer.height=620*this.dpr;
          const paint=layer.getContext('2d');paint.setTransform(this.dpr,0,0,this.dpr,0,0);stadium(paint,theme);
          this.background=layer;this.backgroundKey=key;
        }
        c.drawImage(this.background,0,0,1000,620);
      }else stadium(c,theme);
      for(let row=0;row<7;row++)for(let i=0;i<125;i++)if((i+row*7)%9===0)spectator(c,row,i,time,excited);
    }
    resize(){
      const r=this.canvas.getBoundingClientRect(),dpr=Math.min(2,root.devicePixelRatio||1);
      if(!r.width||!r.height)return;
      this.width=r.width;this.height=r.height;this.dpr=dpr;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
      const portrait=r.width<650&&r.height>r.width*.6;
      const camera=portrait?{x:150,y:80,w:700,h:530}:{x:0,y:0,w:1000,h:620};
      const scale=Math.min(r.width/camera.w,r.height/camera.h);
      this.view={scale,x:(r.width-camera.w*scale)/2-camera.x*scale,y:(r.height-camera.h*scale)/2-camera.y*scale};
    }
    point(event){const r=this.canvas.getBoundingClientRect(),v=this.view;return {x:(event.clientX-r.left-v.x)/v.scale,y:(event.clientY-r.top-v.y)/v.scale};}
    inGoal(p){return p.x>=G.left-35&&p.x<=G.right+35&&p.y>=G.top-25&&p.y<=G.bottom+25;}
    draw(g,save,clock=0){
      if(g?.field?.saveWindow){this.drawFieldSave(g,save,clock);return;}
      if(g?.field?.celebration){this.drawGoalCelebration(g,save,clock);return;}
      if(g?.phase==='feedback'&&g.event==='goal'&&g.time-g.phaseStart>.4&&!g.complete&&!g.rush&&!g.crossbar){
        const team=g.role==='shoot'?0:1;
        this.drawGoalCelebration({...g,field:{score:P.matchScores(g),celebration:{team,scorer:team*5+3,elapsed:Math.min(2.5,g.time-g.phaseStart-.4)}}},save,clock);return;
      }
      if(g?.field?.finish){
        const s=g.field.finish;
        const cacheKey=[s.aim.x,s.aim.y,s.power,s.taker,...g.field.players.flatMap(p=>[p.x,p.y,p.cooldown])].join(':');
        if(this.shotPreviewKey!==cacheKey){this.shotPreview=P.fieldShotPreview(g.field);this.shotPreviewKey=cacheKey;}
        this.drawFieldFinish(g,save,clock);return;
      }
      if(g?.field&&!g.field.pensStarted){P.drawField(this,g,save,clock);return;}
      if(g?.team)save={...save,club:g.team};
      const c=this.ctx;if(!this.width)return;
      const reduced=save.settings.reducedMotion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const time=reduced?0:clock,theme=item(save,'Stadium').variant;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=theme===1?'#33223d':'#0d2333';c.fillRect(0,0,this.width,this.height);
      c.translate(this.view.x,this.view.y);c.scale(this.view.scale,this.view.scale);
      this.backdrop(theme,time,g?.phase==='feedback');
      if(g?.competition?.kind==='champions')this.leagueDress(g.competition.label,time,reduced);
      if(g?.league)this.leagueDress(g.league.label,time,reduced);
      const club=save.club||P.normalizeClub();
      c.fillStyle='#152e38';c.fillRect(310,251,380,14);label(c,club.name.toUpperCase()+'  ·  OUR CLUB. OUR MOMENT.',500,261,8,'#e2e9d7');
      this.goal(g,time,reduced);
      const demo=P.readyKeeperPose(500+Math.sin(time)*4);
      if(!['rush','crossbar'].includes(g?.mode))keeper(c,g?P.keeperPose(g):demo,appearance(save,'keep',g&&g.role==='shoot'?g.opponent:null));
      const scoring=g&&g.phase==='feedback'&&g.role==='shoot'&&g.event==='goal';
      const motion=strikerMotion(g,time,reduced),{kick}=motion;
      const look=appearance(save,'shoot',g&&g.role==='keep'?g.opponent:null);
      // The foreground player is closer to the camera. Anchor the feet and
      // the full kick to the penalty spot when changing the apparent size.
      look.scale=G.keeperScale*1.75;
      const placement=strikerPlacement(look.scale);
      const celebration=scoring?Math.max(0,g.time-Math.max(g.phaseStart,g.shot.started+.48)):0;
      striker(c,placement.x,placement.y,look,kick,reduced&&celebration?1:celebration,reduced?0:item(save,'Celebration').variant,motion);
      if(g?.crossbar){
        const x=P.crossbarTarget(g),r=g.crossbar.radius;
        line(c,x-r,G.top,x+r,G.top,'#ffd56d55',22);line(c,x-r,G.top,x+r,G.top,'#ffd56d',7);
        this.ring(x,G.top,10,'#fff0b9');label(c,g.crossbar.locked===null?'RELEASE TO FREEZE':'GOLD ZONE LOCKED',x,G.top-24,11,'#fff0b9');
      }
      if(g?.rush?.target&&!g.complete){
        const target=g.rush.target;
        ellipse(c,target.x,target.y,target.r,target.r,'#f3c76322');this.ring(target.x,target.y,target.r,'#f3d47a');
        ellipse(c,target.x,target.y,target.r*.4,target.r*.4,'#f3d47a99');this.ring(target.x,target.y,target.r*.4,'#fff1c4');
        label(c,'100',target.x,target.y+4,11,'#11252f');label(c,'TARGET',target.x,target.y<250?target.y+target.r+18:target.y-target.r-10,10,'#f3d47a');
      }
      if(g&&g.phase==='aim'){
        const predicted=P.shotSpec(g,g.charging?g.power:.6);
        c.setLineDash([4,8]);c.strokeStyle='#eaff6290';c.lineWidth=2;c.beginPath();
        for(let i=0;i<=36;i++){const p=P.trajectory(predicted,i/36);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);
        this.cross(g.aim.x,g.aim.y,g.aimLocked?'#eaff62':'#fff',15);
        if(Math.hypot(predicted.target.x-g.aim.x,predicted.target.y-g.aim.y)>3)this.cross(predicted.target.x,predicted.target.y,'#ff956d',10);
        if(!g.crossbar)label(c,g.aimLocked?'TARGET LOCKED':'CLICK TO LOCK',g.aim.x,g.aim.y-25,11,'#eaff62');
        if(g.mode==='practice-shoot'&&save.settings.targets){if(g.drillTarget){this.ring(g.drillTarget.x,g.drillTarget.y,30,'#8de5ff');label(c,'DRILL TARGET',g.drillTarget.x,g.drillTarget.y+44,10,'#8de5ff');}else for(const x of [245,755])for(const y of [185,320])this.ring(x,y,20,'#eaff6244');}
      }
      if(g?.phase==='read'&&g.incoming){
        const assistance=g.mode==='tutorial'?'exact':save.settings.assistance;
        if(assistance!=='off'&&(!g.mode.startsWith('practice')||save.settings.targets)){
          const p=g.incoming.hint;
          if(assistance==='exact'){this.ring(p.x,p.y,23,'#f5e77d');label(c,'READ',p.x,p.y-31,10,'#f5e77d');}
          else{c.fillStyle='#eaff621c';c.fillRect(p.x<500?210:500,p.y<250?155:250,290,90);}
        }
        label(c,`${g.incoming.hint.x<500?'LEFT':'RIGHT'} FOOT SET`,462,398,10,'#ffffffb0');
      }
      if(g?.divePreview&&!g.dive){this.ring(g.divePreview.x,g.divePreview.y,24,'#7ee6ff');label(c,'DIVE TARGET',g.divePreview.x,g.divePreview.y-31,10,'#7ee6ff');}
      if(g?.phase==='feedback'&&g.mode.startsWith('practice')&&save.settings.targets){
        const p=g.contactPose;for(const h of p.hands)this.ring(h.x,h.y,h.r+G.ballRadius,'#79e4ff80');this.cross(g.shot.target.x,g.shot.target.y,g.event==='save'?'#79e4ff':'#ff9b82',9);
      }
      let b={x:500,y:515,r:14,groundY:515,spin:0};
      if(g?.shot&&g.phase!=='kick')b=g.phase==='feedback'?P.rebound(g,g.time-g.phaseStart):P.trajectory(g.shot,(g.time-g.shot.started)/g.shot.duration);
      const altitude=Math.max(0,b.groundY-b.y-b.r);
      softShadow(c,b.x+4,b.groundY+2,b.r*(.85+altitude/500),b.r*.28,.23/(1+altitude/120));ball(c,b.x,b.y,b.r,item(save,'Football'),b.spin);
      if(scoring&&!reduced)this.celebrate(g,save);
      if(g?.phase==='feedback'&&g.event==='post'){const t=g.time-g.phaseStart;if(t<.3)this.ring(g.shot.target.x,g.shot.target.y,10+t*100,`rgba(255,230,151,${1-t/.3})`);}
    }
    drawFieldFinish(g,save,clock){
      if(!this.width)return;
      save={...save,club:g.team};
      const c=this.ctx,f=g.field,s=f.finish,camera=P.fieldCamera(f),reduced=save.settings.reducedMotion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const project=p=>{const q=P.fieldProject(f,p,camera);return {...q,y:q.y-(p.z||0)*q.zScale};};
      const depth=p=>(p.x-camera.x)*camera.fx+(p.y-camera.y)*camera.fy;
      const between=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z||0)+((b.z||0)-(a.z||0))*t});
      const segment=(a,b,color,width=1)=>{
        const da=depth(a),db=depth(b);if(da<2&&db<2)return;
        if(da<2)a=between(a,b,(2-da)/(db-da));else if(db<2)b=between(a,b,(2-da)/(db-da));
        const x=project(a),y=project(b);line(c,x.x,x.y,y.x,y.y,color,width);
      };
      const polygon=(points,color)=>{
        const clipped=[];for(let i=0;i<points.length;i++){
          const a=points[i],b=points[(i+1)%points.length],da=depth(a),db=depth(b);
          if(da>=2)clipped.push(a);if((da>=2)!==(db>=2))clipped.push(between(a,b,(2-da)/(db-da)));
        }
        if(clipped.length>2)path(c,clipped.map(p=>{const q=project(p);return [q.x,q.y];}),color);
      };
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#10252f';c.fillRect(0,0,this.width,this.height);c.translate(this.view.x,this.view.y);c.scale(this.view.scale,this.view.scale);
      this.backdrop(item(save,'Stadium').variant,reduced?0:clock,false);
      const grass=c.createLinearGradient(0,250,0,620);grass.addColorStop(0,'#408354');grass.addColorStop(1,'#244d32');c.fillStyle=grass;c.fillRect(0,250,1000,1000);
      c.save();c.beginPath();c.moveTo(0,135);c.lineTo(1000,135);c.lineTo(1000,535);c.lineTo(0,535);c.closePath();c.clip();
      for(let x=0;x<1100;x+=80)polygon([{x,y:0},{x:x+80,y:0},{x:x+80,y:600},{x,y:600}],x%160?'#a0c98e0d':'#163d2312');
      for(const [x,top,bottom]of [[1000,0,600],[845,125,475],[945,175,425],[500,0,600]]){
        segment({x,y:top},{x,y:bottom},'#edf3dcad',1.6);
        if(top){segment({x,y:top},{x:1000,y:top},'#edf3dcad',1.6);segment({x,y:bottom},{x:1000,y:bottom},'#edf3dcad',1.6);}
      }
      for(const y of [0,600])segment({x:0,y},{x:1030,y},'#edf3dca0',2);
      polygon([{x:1000,y:220},{x:1030,y:220},{x:1030,y:380},{x:1000,y:380}],'#0b292a45');
      polygon([{x:1030,y:220},{x:1030,y:380},{x:1030,y:380,z:58},{x:1030,y:220,z:58}],'#c2dadc12');
      for(let y=220;y<=380;y+=10){segment({x:1030,y},{x:1030,y,z:58},'#dce9e367');segment({x:1000,y,z:58},{x:1030,y,z:58},'#dce9e350');}
      for(let z=0;z<=58;z+=7.25){segment({x:1030,y:220,z},{x:1030,y:380,z},'#dce9e367');for(const y of [220,380])segment({x:1000,y,z},{x:1030,y,z},'#dce9e350');}
      for(const y of [220,380]){segment({x:1000,y},{x:1030,y},'#bbcbd482',2);segment({x:1030,y},{x:1030,y,z:58},'#bbcbd482',2);}
      const frameWidth=P.clamp(project({x:1000,y:300}).zScale*1.4,2,6);
      segment({x:1000,y:220},{x:1000,y:220,z:58},'#f6faf0',frameWidth);segment({x:1000,y:380},{x:1000,y:380,z:58},'#f6faf0',frameWidth);segment({x:1000,y:220,z:58},{x:1000,y:380,z:58},'#f6faf0',frameWidth);
      for(const p of f.players.filter(p=>p.id!==s.taker&&depth(p)>5).sort((a,b)=>depth(b)-depth(a))){
        const spot=project(p);if(spot.x<-180||spot.x>1180)continue;
        const scale=Math.min(3.4,spot.scale);
        if(p.keeper){c.save();c.translate(spot.x,spot.y);c.scale(scale,scale);c.translate(-500,-G.bottom);keeper(c,P.readyKeeperPose(),appearance(save,'keep',p.team?{...g.opponent,color:'#d1b86b'}:null));c.restore();}
        else this.matchPlayer(spot.x,spot.y,scale*1.28,appearance(save,'shoot',p.team?g.opponent:null),p.id===3?g.team.number:[1,4,7,10,11][p.id%5],0,p.id);
      }
      const points=this.shotPreview.points;c.setLineDash([4,7]);for(let i=1;i<points.length;i++)segment(points[i-1],points[i],'#eaff82aa',2);c.setLineDash([]);
      const target=project({x:1000,y:220+(s.aim.x-200)/600*160,z:(350-s.aim.y)/210*58});this.cross(target.x,target.y,'#eaff82',12);
      c.restore();
      c.fillStyle='#102837ed';c.fillRect(280,85,440,47);label(c,'CHOOSE YOUR FINISH',500,103,14,'#f0d08b');label(c,`PLAYER VIEW  /  ${s.remaining.toFixed(1)}s`,500,122,13,'#fff5d6');
      this.drawShotPreview({...g,finishField:f,preview:this.shotPreview});
    }
    matchPlayer(x,y,scale,look,number,celebration=0,id=0){
      const c=this.ctx,skin=['#c7997a','#a37555','#e1b18b','#86583c','#bc8b6c'][id%5];
      c.save();c.translate(x,y);c.scale(scale,scale);softShadow(c,0,0,19,4,.25);
      const pose=P.celebrationPose(id,celebration),foreground=[];
      c.translate(pose.x,pose.y);c.rotate(pose.angle);
      if(celebration>1.65&&look.celebrationVariant===1)c.scale(.3+.7*Math.abs(Math.cos((celebration-1.65)*5)),1);
      if(celebration>1.65&&look.celebrationVariant===2)c.translate(0,-Math.abs(Math.sin((celebration-1.65)*5))*17);
      for(const l of pose.legs){
        const {side,hip,knee,foot}=l;
        limb(c,hip.x,hip.y,knee.x,knee.y,11,8,skin);limb(c,knee.x,knee.y,foot.x,foot.y,8,5,look.design?.secondary||'#e4e8e0');
        shortsLeg(c,hip,knee,look.design?.primary||'#213c50');boot(c,foot.x,foot.y+1,side,look.boots);sockBands(c,knee,foot,look.sockTape,6);
        const arm=pose.arms[side<0?0:1],ex=arm.elbow.x,ey=arm.elbow.y,hx=arm.hand.x,hy=arm.hand.y;
        const sleeve=look.sleeves?.variant?look.sleeves.color:skin;
        limb(c,side*15,-81,ex,ey,8,6,sleeve);limb(c,side*15,-81,side*15+(ex-side*15)*.42,-81+(ey+81)*.42,10,8,look.kit);
        if(side<0)accessoryBand(c,{x:side*15,y:-81},{x:ex,y:ey},8.5,look.armband,.27,true);
        foreground.push(()=>{
          limb(c,ex,ey,hx,hy,6,4,sleeve);accessoryBand(c,{x:ex,y:ey},{x:hx,y:hy},4.8,look.wristTape,.77);
          if(look.isKeeper)glove(c,hx,hy,look.gloves,Math.atan2(hy-ey,hx-ex)+Math.PI/2,side,.55);
          else drawHand(c,hx,hy,side,Math.atan2(hy-ey,hx-ex)-Math.PI/2);
        });
      }
      kit(c,0,-68,look.kit,look.variant,34,38,look.design);label(c,String(number),0,-65,10,ink(look.kit));
      limb(c,0,-88,0,-92,7,7,skin);c.save();c.translate(0,-101);c.rotate(pose.headAngle);head(c,0,0,false,look.headband,{...look,skin},id);c.restore();foreground.forEach(draw=>draw());
      if(id===4&&celebration>.32){c.beginPath();c.moveTo(0,-73);c.quadraticCurveTo(-8,-79,-3,-80);c.quadraticCurveTo(-1,-80,0,-78);c.quadraticCurveTo(1,-80,3,-80);c.quadraticCurveTo(8,-79,0,-73);c.strokeStyle=look.design?.secondary||'#fff0de';c.lineWidth=1.3;c.stroke();}c.restore();
    }
    drawFieldSave(g,save,clock){
      if(!this.width)return;
      const f=g.field,w=f.saveWindow,c=this.ctx,reduced=save.settings.reducedMotion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#10252f';c.fillRect(0,0,this.width,this.height);c.translate(this.view.x,this.view.y);c.scale(this.view.scale,this.view.scale);
      this.backdrop(item(save,'Stadium').variant,reduced?0:clock,false);this.goal(null,0,true);
      const target=P.fieldSavePoint(w.end),pose=P.fieldSavePose(g),progress=w.elapsed/(w.duration??1);
      if(!w.result){this.ring(target.x,target.y,18,'#9be7ff');label(c,'BALL TARGET',P.clamp(target.x,255,745),P.clamp(target.y-27,170,330),11,'#b9efff');}
      keeper(c,pose,appearance({...save,club:g.team},'keep'));
      const actual=P.fieldSavePoint(f.ball),point=w.result==='save'?{x:(pose.hands[0].x+pose.hands[1].x)/2,y:(pose.hands[0].y+pose.hands[1].y)/2}:{x:500+(actual.x-500)*progress,y:515+(actual.y-515)*progress};
      ball(c,point.x,point.y,14-progress*6,item(save,'Football'),progress*8);
      c.fillStyle='#0b2238e8';c.fillRect(300,82,400,49);label(c,w.result==='save'?'SAVED!':w.result==='block'?'BLOCKED':w.result==='wide'?'OFF TARGET':w.result?'SHOT GETS THROUGH':'YOUR SAVE · '+w.remaining.toFixed(2)+'s',500,113,23,w.result==='save'?'#b9f3ce':'#b9efff');
      c.fillStyle='#112b40ed';c.fillRect(255,553,490,42);label(c,w.dive?'DIVE COMMITTED':'CLICK THE TARGET / W HIGH · S LOW + A OR D',500,579,13,'#e9f2ec');
    }
    drawShotPreview(g){
      const c=this.ctx,p=g.preview,color=p.blocker!==null?'#ffad89':p.onTarget?'#eaff82':'#ffb085';
      if(p.crossing){const spot=P.fieldProject(g.finishField,p.crossing);this.ring(spot.x,spot.y-p.crossing.z*spot.zScale,10,color);}
      const message=p.blocker!==null?'PLAYER IN THE SHOT PATH':p.onTarget?'PROJECTED FINISH · KEEPER CAN STILL SAVE':'PROJECTED WIDE / OVER';
      c.fillStyle='#102837ed';c.fillRect(265,542,470,62);label(c,`${p.distance}m · ${message}`,500,557,11,color);label(c,'Dotted line = flight · ring = goal-line arrival',500,576,10,'#d4e1e5');label(c,'CLICK THE GOAL / ARROWS TO AIM',500,595,10,'#fff5d6');
      if(p.distance<25)return;
      // A small overhead view stays legible on the portrait camera too.
      const x=610,y=402,w=202,h=121;c.fillStyle='#102837f2';c.fillRect(x-9,y-22,w+18,h+30);
      label(c,'SHOT MAP / EXPECTED PATH',x+w/2,y-8,9,'#e7eddb');c.fillStyle='#316d50';c.fillRect(x,y,w,h);c.strokeStyle='#dbe8d388';c.lineWidth=1;c.strokeRect(x,y,w,h);c.strokeRect(x+w*.845,y+h*125/600,w*.155,h*350/600);
      const point=b=>({x:x+b.x/1000*w,y:y+b.y/600*h});c.beginPath();p.points.forEach((b,i)=>{const q=point(b);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.strokeStyle=color;c.lineWidth=2;c.stroke();
      for(const pl of g.finishField.players){const q=point(pl);ellipse(c,q.x,q.y,2.5,2.5,pl.team?'#ffa58d':'#b1d6ff');}
      const end=point(p.end);this.ring(end.x,end.y,4,color);
      if(p.landing){const land=point(p.landing);this.cross(land.x,land.y,'#e9eee1',3);}
    }
    drawGoalCelebration(g,save,clock){
      if(!this.width)return;
      const f=g.field,a=f.celebration,c=this.ctx,reduced=save.settings.reducedMotion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const time=reduced?1:a.elapsed,team=a.team===0?g.team.name:g.opponent.name,number=a.scorer===3?g.team.number:[1,4,7,10,11][a.scorer%5];
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#10252f';c.fillRect(0,0,this.width,this.height);c.translate(this.view.x,this.view.y);c.scale(this.view.scale,this.view.scale);
      this.backdrop(item(save,'Stadium').variant,reduced?0:clock,true);this.goal(null,0,true);
      if(a.team===0&&!reduced)this.celebrate({time:a.elapsed,phaseStart:0,shot:{target:{x:500,y:340}}},save);
      const keeper=a.scorer%5===0,look={...appearance({...save,club:g.team},keeper?'keep':'shoot',a.team?{...g.opponent,color:keeper?'#d1b86b':g.opponent.color}:null),isKeeper:keeper,celebrationVariant:reduced?0:a.team?a.scorer%3:item(save,'Celebration').variant};
      const mateLook=appearance({...save,club:g.team},'shoot',a.team?g.opponent:null),mates=[1,2,3,4].map(id=>a.team*5+id).filter(id=>id!==a.scorer).slice(0,2);
      mates.forEach((id,i)=>{const side=i?1:-1,mateNumber=id===3?g.team.number:[1,4,7,10,11][id%5];this.matchPlayer(500+side*(115+(1-Math.min(1,time))*75),475,1.65,mateLook,mateNumber,time*.7,id);});
      this.matchPlayer(500,520,2.7,look,number,Math.max(.01,time),a.scorer);
      c.fillStyle='#102435dc';c.fillRect(200,88,600,68);label(c,a.team===0?'GOAL!':'OPPONENT GOAL',500,116,24,'#f1d493');label(c,`${team.toUpperCase()} · ${a.ownGoal?'OWN GOAL':`#${number}`} · ${f.score.join(' : ')}`,500,141,13,'#f0f3eb');
      label(c,P.playerName(g,a.scorer).toUpperCase(),500,551,19,'#f0d598');label(c,P.celebrationNames[a.scorer].toUpperCase(),500,573,12,'#e5eddf');label(c,'SPACE / ENTER OR SKIP TO CONTINUE',500,597,10,'#e5eddf');
    }
    drawVictory(g,save,elapsed,reduced=false){
      if(!this.width)return;
      // Let the deciding ball finish its first rebound before the camera cuts.
      if(elapsed<.55&&!reduced){this.draw({...g,time:g.time+elapsed},save,g.time+elapsed);return;}
      if(g.team)save={...save,club:g.team};
      const c=this.ctx,ease=t=>{t=P.clamp(t,0,1);return t*t*(3-2*t);};
      const time=reduced?3.8:Math.max(0,elapsed-.55),zoom=reduced?1.08:1+ease(time/5.3)*.12;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#10252f';c.fillRect(0,0,this.width,this.height);
      c.translate(this.view.x,this.view.y);c.scale(this.view.scale,this.view.scale);
      c.translate(500,340);c.scale(zoom,zoom);c.translate(-500,-340);
      this.backdrop(item(save,'Stadium').variant,reduced?0:time,true);
      const champions=g.mode==='league'&&g.league.stage==='final'||g.mode==='competition'&&save.competitions[g.competition.kind]?.champion===0;
      if(g.mode==='league')this.leagueDress(champions?'CHAMPIONS OF THE NIGHT':g.league.label,time,reduced);
      this.goal(null,0,true);
      const glow=c.createRadialGradient(500,290,20,500,290,340);
      glow.addColorStop(0,'#fff3c319');glow.addColorStop(1,'#fff3c300');c.fillStyle=glow;c.fillRect(100,0,800,610);
      const look=appearance(save,'shoot'),join=ease(time/1.7),lift=ease((time-.28)/1.25);
      // Teammates walk into place, then raise their arms to the home crowd.
      for(const [side,number]of [[-1,'7'],[1,'11']]){
        const entering=time<1.7&&!reduced,step=entering?time/1.7:1;
        const x=side<0?385-(1-join)*80:715+(1-join)*80;
        const mate={...look,number,shirtName:save.club.shortName,scale:2.18,armband:null,headband:null};
        striker(c,x,480,mate,0,entering?0:.18*ease((time-1.7)/.8),0,
          {inMatch:true,approach:step,time:reduced?0:time,reduced,lean:reduced?0:Math.sin(time*1.7+side)*.012});
      }
      striker(c,560,535,{...look,scale:2.85},0,lift*.18,0,
        {inMatch:false,approach:1,time:reduced?0:time,reduced,lean:reduced?0:Math.sin(time*1.7)*.012});
      if(champions){
        // The trophy rests on a presentation plinth, in front of the squad.
        softShadow(c,500,550,48,10,.32);
        const plinth=c.createLinearGradient(462,490,538,490);plinth.addColorStop(0,'#11263d');plinth.addColorStop(.45,'#29496b');plinth.addColorStop(1,'#0e2137');
        smoothPath(c,[[465,487],[535,487],[536,542],[529,550],[471,550],[464,542]],plinth,'#9bb6cb40',1);
        ellipse(c,500,487,35,5,'#52708b');curve(c,467,541,500,549,533,541,'#d4bd7f80',1.3);
        label(c,'PANIC',500,522,7,'#d7c691');trophy(c,500,480,.75);
      }
      if(!reduced){
        const colors=['#f4d37f',look.design?.secondary||'#c5e0d5','#f4f0dc'];
        for(let i=0;i<48;i++){
          const speed=38+i%7*7,fall=(time*speed+i*73)%660;
          const x=135+i*137%740+Math.sin(time*1.6+i)*18,y=fall-45;
          c.save();c.translate(x,y);c.rotate(i+time*(i%2?1:-1));
          curve(c,-2,-5,4,0,-1,5,colors[i%3],1.7+Math.sin(time*2+i)**2);c.restore();
        }
      }
    }
    leagueDress(caption,time,reduced){
      const c=this.ctx;
      c.fillStyle='#1c3266';c.fillRect(-50,249,1100,18);
      for(let i=0;i<7;i++){const x=i*165-5;label(c,i%2?'CHAMPIONS LEAGUE':'NIGHTS OF GLORY',x+75,261,7.5,i%2?'#e5d398':'#b6c9ef');}
      curve(c,-50,58,500,116,1050,58,'#90b6f33d',2);
      for(const x of [65,935]){
        const sway=reduced?0:Math.sin(time*.25+x)*20;
        const beam=c.createLinearGradient(x,60,x+sway,340);beam.addColorStop(0,'#bfd9ff18');beam.addColorStop(1,'#bfd9ff00');
        path(c,[[x-5,60],[x+5,60],[x+80+sway,340],[x-80+sway,340]],beam);
      }
      smoothPath(c,[[370,24],[630,24],[630,49],[370,49]],'#101e3dda','#a8bee938',1);
      label(c,caption,500,41,10,'#e5d39d');
    }
    cross(x,y,color,r){this.ring(x,y,r,color);line(this.ctx,x-r-5,y,x+r+5,y,color,1.4);line(this.ctx,x,y-r-5,x,y+r+5,color,1.4);}
    ring(x,y,r,color){const c=this.ctx;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
    goal(g,time,reduced=false){
      const c=this.ctx,shake=g?.phase==='feedback'&&g.event==='goal'&&!reduced?Math.exp(-(g.time-g.phaseStart)*3)*Math.sin((g.time-g.phaseStart)*25)*9:0;
      path(c,[[G.left,G.bottom],[G.right,G.bottom],[G.right+25,G.bottom+16],[G.left+40,G.bottom+16]],'#061c2114');
      path(c,[[G.left,G.top],[G.left+20,G.top-15],[G.right-20,G.top-15],[G.right,G.top]],'#c0d9dc0c','#c0d9dc26');
      path(c,[[G.right,G.top],[G.right-20,G.top-15],[G.right-20,G.bottom-17],[G.right,G.bottom]],'#a4c7ca0d','#c0d9dc2a');
      path(c,[[G.left,G.top],[G.left+20,G.top-15],[G.left+20,G.bottom-17],[G.left,G.bottom]],'#c0d9dc0b','#c0d9dc26');
      path(c,[[G.left,G.bottom],[G.left+20,G.bottom-17],[G.right-20,G.bottom-17],[G.right,G.bottom]],'#d4e6d20b');
      for(let y=G.top+12;y<G.bottom;y+=18){line(c,G.right,y,G.right-20,y-16,'#c0d9dc35',.8);line(c,G.left,y,G.left+20,y-16,'#c0d9dc35',.8);}
      // The mesh sits behind the posts, with visible roof, side and floor depth.
      path(c,[[220,125],[780,125],[780,333],[220,333]],'#b4eeeb09');
      for(let x=220;x<=780;x+=20){c.beginPath();c.moveTo(x,125);c.quadraticCurveTo(x+shake,235,x,333);c.strokeStyle='#e1e9e34a';c.lineWidth=.8;c.stroke();}
      for(let y=125;y<=333;y+=15){c.beginPath();c.moveTo(220,y);c.quadraticCurveTo(500,y+shake+2,780,y);c.stroke();}
      for(let x=G.left;x<=G.right;x+=30){const backX=220+(x-G.left)/600*560;line(c,x,G.top,backX,125,'#d2e0de35',.8);line(c,x,G.bottom,backX,333,'#d2e0de28',.8);}
      line(c,G.left,G.bottom,G.left,G.top,'#effbf5',7);line(c,G.left,G.top,G.right,G.top,'#fff',8);line(c,G.right,G.top,G.right,G.bottom,'#effbf5',7);
      line(c,G.left+2,G.bottom,G.left+2,G.top+3,'#90a7a755',1.3);line(c,G.left+3,G.top+2,G.right-3,G.top+2,'#90a7a755',1.2);line(c,G.right+2,G.top+3,G.right+2,G.bottom,'#90a7a755',1.3);
      line(c,G.left,G.top,G.left+20,G.top-15,'#8caeb4',2);line(c,G.left+20,G.top-15,G.right-20,G.top-15,'#8caeb4',2);line(c,G.right-20,G.top-15,G.right,G.top,'#8caeb4',2);
    }
    celebrate(g,save){
      const c=this.ctx,t=g.time-g.phaseStart,effect=item(save,'Goal effect');if(t>2)return;
      c.globalAlpha=1-t/2;
      if(effect.variant===2){for(let i=0;i<3;i++)this.ring(g.shot.target.x,g.shot.target.y,15+t*90+i*15,effect.color);}
      else for(let i=0;i<32;i++){const a=i*2.399,x=g.shot.target.x+Math.cos(a)*t*130,y=g.shot.target.y-Math.sin(a)*t*150+150*t*t;c.fillStyle=i%2?effect.color:'#fff';if(effect.variant===1){c.save();c.translate(x,y);c.rotate(t*3);path(c,Array.from({length:10},(_,j)=>[Math.cos(j*Math.PI/5)*(j%2?3:7),Math.sin(j*Math.PI/5)*(j%2?3:7)]),c.fillStyle);c.restore();}else c.fillRect(x,y,4,7);}
      c.globalAlpha=1;
    }
  }
  function preview(canvas,save,selected,time=0){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
    const skin=typeof selected==='string'?P.items.find(i=>i.id===selected):selected;
    const temp={...save,club:{...save.club,custom:['Player kit','Keeper kit'].includes(skin.category)?false:save.club.custom},equipped:{...save.equipped,[skin.category]:skin.id}};
    const gradient=c.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.6);gradient.addColorStop(0,skin.color+'33');gradient.addColorStop(1,'#10293700');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    if(skin.category==='Football'){ball(c,w/2,h/2,Math.min(h*.34,45),skin,time*.4);return;}
    if(skin.category==='Gloves'){const size=Math.min(w/92,h/43);glove(c,w*.32,h*.51,skin.color,-.12,1,size);glove(c,w*.68,h*.51,skin.color,.12,-1,size);return;}
    if(skin.category==='Headband'){
      const size=Math.min(w/70,h/34);for(const [x,back]of [[w*.29,false],[w*.71,true]]){c.save();c.translate(x,h*.51);c.scale(size,size);head(c,0,0,back,skin,{gender:P.playerGender(save.club)},3);c.restore();}return;
    }
    if(skin.category==='Wrist tape'){
      const size=Math.min(w/90,h/38);for(const side of [-1,1]){c.save();c.translate(w*(side<0?.3:.7),h*.52);c.scale(size,size);c.rotate(side*-.15);limb(c,0,-12,0,7,7,4.5,'#bd8c6d');accessoryBand(c,{x:0,y:-12},{x:0,y:7},5.5,skin,.6);drawHand(c,0,7,side,0);c.restore();}return;
    }
    if(skin.category==='Stadium'){c.fillStyle=skin.color;c.fillRect(12,14,w-24,h-28);for(let i=0;i<3;i++){line(c,15,35+i*13,w-15,35+i*13,'#ffffff35',6);}path(c,[[12,h-40],[w-12,h-40],[w-12,h-14],[12,h-14]],'#319467');line(c,w/2-30,h-25,w/2-30,h-65,'#fff',3);line(c,w/2-30,h-65,w/2+30,h-65,'#fff',3);line(c,w/2+30,h-65,w/2+30,h-25,'#fff',3);return;}
    if(skin.category==='Goal effect'){for(let i=0;i<16;i++){const a=i*2.4;const r=18+(time*.5+i*.07)%1*35;ellipse(c,w/2+Math.cos(a)*r,h/2+Math.sin(a)*r,skin.variant===2?5:3,skin.variant===2?5:6,i%2?skin.color:'#fff');}return;}
    const keeping=skin.category==='Keeper kit',celebrating=skin.category==='Celebration',size=Math.min(h/(keeping?165:celebrating?160:135),1.4);
    c.save();c.translate(w/2+(keeping?0:9*size),keeping?h/2+8:h*.88);c.scale(size,size);
    if(skin.category==='Keeper kit'){const a=appearance(temp,'keep');keeper(c,P.readyKeeperPose(0,0),a);}
    else striker(c,0,0,appearance(temp,'shoot'),0,skin.category==='Celebration'?time+1:0,skin.variant);
    c.restore();
    if(skin.category==='Boots'){line(c,w/2-40,h-20,w/2-8,h-20,skin.color,13);line(c,w/2+8,h-20,w/2+40,h-20,skin.color,13);}
  }
  function clubPreview(canvas,save,draft,slot='home'){
    const club=P.normalizeClub(draft),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);c.fillStyle='#112733';c.fillRect(0,0,w,h);
    const a=appearance({...save,club:{...club,activeKit:slot==='away'?'away':'home'}},slot==='keeper'?'keep':'shoot');
    const glow=c.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.6);glow.addColorStop(0,a.kit+'40');glow.addColorStop(1,'#11273300');c.fillStyle=glow;c.fillRect(0,0,w,h);
    const scale=Math.min(w/200,h/150);
    for(const [index,front]of [[0,true],[1,false]]){
      c.save();c.translate(w*(index?.73:.27),h*.49);c.scale(scale,scale);
      // Use the match shirt drawing for both views, with sleeves and collar.
      for(const side of [-1,1])limb(c,side*16,-14,side*26,4,11,9,a.kit);
      kit(c,0,0,a.kit,a.variant,42,58,a.design);
      const textColor=ink(a.kit);
      if(front){crest(c,10,-11,8,club);shirtText(c,slot==='keeper'?'1':club.shortName,0,10,slot==='keeper'?14:10,textColor);}
      else{shirtText(c,club.shirtName,0,-11,Math.min(5.5,46/Array.from(club.shirtName).length),textColor);shirtText(c,slot==='keeper'?'1':String(club.number),0,14,23,textColor);}
      c.restore();label(c,front?'FRONT':'BACK',w*(index?.73:.27),h*.88,11,'#b7ccd2');
    }
  }
  function squadPreview(canvas,save,draft){
    if(!canvas)return;
    const club=P.normalizeClub(draft),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min(w/450,h/145),g={team:club};
    c.clearRect(0,0,w,h);c.fillStyle='#112733';c.fillRect(0,0,w,h);
    const glow=c.createLinearGradient(0,0,0,h);glow.addColorStop(0,'#31534300');glow.addColorStop(1,'#315343');c.fillStyle=glow;c.fillRect(0,0,w,h);
    line(c,w*.05,h*.87,w*.95,h*.87,'#b9d8bf38',1);
    for(let i=0;i<5;i++){
      const look=appearance({...save,club},i===0?'keep':'shoot');look.isKeeper=i===0;
      Renderer.prototype.matchPlayer.call({ctx:c},w*(i+.5)/5,h*.88,scale,look,P.playerNumber(g,i),0,i);
    }
  }
  Object.assign(P,{Renderer,preview,clubPreview,squadPreview,drawPlayerHead:head,strikerPose,strikerMotion,strikerPlacement});
})(window);
