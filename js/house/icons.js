/* Kamericonen, getekend op een 2D-canvas.
   Gedeeld door de bordjes op de huisvorm (shell.js) en de rest van het huis. */
export function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
export function drawIcon(ctx, key, cx, cy, s, color){
  ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#fff'; ctx.strokeStyle='#fff';
  ctx.lineWidth=s*0.12; ctx.lineCap='round'; ctx.lineJoin='round';
  const c=color;
  if(key==='memory'){
    for(const [dx,dy,rot] of [[-0.32,0.12,-.18],[0.28,-0.06,.16]]){
      ctx.save();ctx.translate(dx*s,dy*s);ctx.rotate(rot);
      ctx.fillStyle='#fff';rr(ctx,-0.34*s,-0.46*s,0.68*s,0.92*s,0.12*s);ctx.fill();
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,0.17*s,0,7);ctx.fill();ctx.restore();
    }
  } else if(key==='puzzle'){
    ctx.fillStyle='#fff';ctx.beginPath();const u=0.42*s;
    ctx.moveTo(-u,-u); ctx.lineTo(-0.12*s,-u);
    ctx.arc(0,-u,0.16*s,Math.PI,0,true); ctx.lineTo(u,-u); ctx.lineTo(u,-0.12*s);
    ctx.arc(u,0,0.16*s,-Math.PI/2,Math.PI/2,false); ctx.lineTo(u,u); ctx.lineTo(-u,u);
    ctx.closePath(); ctx.fill();
  } else if(key==='shapes'){
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(-0.26*s,-0.12*s,0.19*s,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(0.24*s,-0.34*s);ctx.lineTo(0.46*s,0.06*s);ctx.lineTo(0.02*s,0.06*s);ctx.closePath();ctx.fill();
    rr(ctx,-0.2*s,0.16*s,0.4*s,0.32*s,0.07*s);ctx.fill();
  } else if(key==='count'){
    ctx.fillStyle='#fff';ctx.font='800 '+(0.9*s)+"px 'Baloo 2', sans-serif";
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('123',0,0.02*s);
  } else if(key==='palette'){
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,0,0.46*s,0.4*s,0,0,7);ctx.fill();
    ctx.fillStyle=c;ctx.beginPath();ctx.arc(0.16*s,0.12*s,0.12*s,0,7);ctx.fill();
    const dots=[['#F0574F',-0.22,-0.14],['#3E7BF0',0.04,-0.22],['#57C24D',0.24,-0.06],['#FBC02D',-0.24,0.12]];
    for(const [dc,dx,dy] of dots){ctx.fillStyle=dc;ctx.beginPath();ctx.arc(dx*s,dy*s,0.07*s,0,7);ctx.fill();}
  } else if(key==='dressup'){
    ctx.fillStyle='#fff';ctx.beginPath();
    ctx.moveTo(-0.16*s,-0.34*s);ctx.lineTo(-0.4*s,-0.16*s);ctx.lineTo(-0.28*s,-0.02*s);ctx.lineTo(-0.22*s,-0.08*s);
    ctx.lineTo(-0.22*s,0.42*s);ctx.lineTo(0.22*s,0.42*s);ctx.lineTo(0.22*s,-0.08*s);ctx.lineTo(0.28*s,-0.02*s);
    ctx.lineTo(0.4*s,-0.16*s);ctx.lineTo(0.16*s,-0.34*s);
    ctx.arc(0,-0.34*s,0.16*s,0,Math.PI,false);ctx.closePath();ctx.fill();
  } else if(key==='play'){
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,0.42*s,0,7);ctx.fill();
    ctx.strokeStyle=c;ctx.lineWidth=s*0.08;
    ctx.beginPath();ctx.arc(0,0,0.42*s,-0.4,0.9);ctx.stroke();
    ctx.beginPath();ctx.arc(-0.5*s,0.2*s,0.5*s,-0.9,-0.1);ctx.stroke();
    ctx.beginPath();ctx.arc(0.5*s,-0.2*s,0.5*s,2.3,3.1);ctx.stroke();
  } else if(key==='sticker'){
    ctx.fillStyle='#fff';star(ctx,0,0,0.44*s,0.2*s,5);ctx.fill();
    ctx.fillStyle='#fff';for(const [dx,dy,r] of [[0.34,-0.32,0.06],[-0.36,0.3,0.05],[0.36,0.32,0.045]]){ctx.beginPath();ctx.arc(dx*s,dy*s,r*s,0,7);ctx.fill();}
  }
  ctx.restore();
}
export function star(ctx,cx,cy,R,r,n){ctx.beginPath();for(let i=0;i<n*2;i++){const ang=-Math.PI/2+i*Math.PI/n;const rad=i%2?r:R;ctx.lineTo(cx+Math.cos(ang)*rad,cy+Math.sin(ang)*rad);}ctx.closePath();}
