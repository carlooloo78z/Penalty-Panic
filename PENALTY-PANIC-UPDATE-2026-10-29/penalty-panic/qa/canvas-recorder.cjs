// Geometry/colour capture of the real Canvas renderer for a native static review.
module.exports=function recorder(){
 let matrix=[1,0,0,1,0,0],stack=[],points=[],records=[],clips=[];
 const xy=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
 const scale=()=>Math.hypot(matrix[0],matrix[1]);
 const c={fillStyle:'#fff',strokeStyle:'#fff',lineWidth:1,globalAlpha:1,dash:[],font:'12px Arial',textAlign:'center',
 save(){stack.push({matrix:[...matrix],clips:[...clips],fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,globalAlpha:this.globalAlpha,dash:[...this.dash],font:this.font,textAlign:this.textAlign});},
 restore(){const s=stack.pop();matrix=s.matrix;clips=s.clips;Object.assign(this,s);},setTransform(...m){matrix=m;},
 transform(a,b,c,d,e,f){const [aa,bb,cc,dd,ee,ff]=matrix;matrix=[aa*a+cc*b,bb*a+dd*b,aa*c+cc*d,bb*c+dd*d,aa*e+cc*f+ee,bb*e+dd*f+ff];},
 translate(x,y){const p=xy(x,y);matrix[4]=p[0];matrix[5]=p[1];},scale(x,y){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
 rotate(a){const [a0,b,c0,d]=matrix,co=Math.cos(a),si=Math.sin(a);matrix[0]=a0*co+c0*si;matrix[1]=b*co+d*si;matrix[2]=c0*co-a0*si;matrix[3]=d*co-b*si;},
 beginPath(){points=[];},moveTo(x,y){points.push(xy(x,y));},lineTo(x,y){points.push(xy(x,y));},
 quadraticCurveTo(cx,cy,x,y){const p=points.at(-1),q=xy(cx,cy),r=xy(x,y);for(let i=1;i<=16;i++){const t=i/16;points.push([(1-t)**2*p[0]+2*(1-t)*t*q[0]+t*t*r[0],(1-t)**2*p[1]+2*(1-t)*t*q[1]+t*t*r[1]]);}},
 closePath(){points.push(points[0]);},
 ellipse(x,y,rx,ry,rot=0,start=0,end=Math.PI*2){for(let i=0;i<=48;i++){const a=start+i/48*(end-start),px=Math.cos(a)*rx,py=Math.sin(a)*ry;points.push(xy(x+px*Math.cos(rot)-py*Math.sin(rot),y+px*Math.sin(rot)+py*Math.cos(rot)));}},
 arc(x,y,r,start,end){this.ellipse(x,y,r,r,0,start,end);},setLineDash(d){this.dash=d;},
 clip(){clips.push([...points]);},
 fill(){records.push({kind:'fill',points:[...points],color:this.fillStyle,alpha:this.globalAlpha,clips:[...clips]});},
 stroke(){records.push({kind:'stroke',points:[...points],color:this.strokeStyle,width:this.lineWidth*scale(),alpha:this.globalAlpha,dash:this.dash,clips:[...clips]});},
 strokeRect(x,y,w,h){this.beginPath();this.moveTo(x,y);this.lineTo(x+w,y);this.lineTo(x+w,y+h);this.lineTo(x,y+h);this.closePath();this.stroke();},
 fillRect(x,y,w,h){const p=points;points=[xy(x,y),xy(x+w,y),xy(x+w,y+h),xy(x,y+h)];this.fill();points=p;},clearRect(){},
 createLinearGradient(x1,y1,x2,y2){return {type:'linear',from:xy(x1,y1),to:xy(x2,y2),stops:[],addColorStop(n,v){this.stops.push([n,v]);}};},
 createRadialGradient(x1,y1,r1,x2,y2,r2){return {type:'radial',from:xy(x1,y1),to:xy(x2,y2),radius:r2*scale(),radiusY:r2*Math.hypot(matrix[2],matrix[3]),stops:[],addColorStop(n,v){this.stops.push([n,v]);}};},
 fillText(text,x,y){records.push({kind:'text',text,point:xy(x,y),color:this.fillStyle,alpha:this.globalAlpha,size:Number(this.font.match(/([\d.]+)px/)?.[1]||12)*scale(),align:this.textAlign,clips:[...clips]});}
 };
 return {c,records};
};
