"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp } from '@clerk/nextjs';

export default function ModernLoginSignup() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!signIn) {
      alert("Clerk is not fully loaded yet. Please wait a second and try again.");
      return;
    }
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      alert("Google Sign In Error: " + (err.errors?.[0]?.message || err.message || JSON.stringify(err)));
    }
  };

  const handleGoogleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!signUp) {
      alert("Clerk is not fully loaded yet. Please wait a second and try again.");
      return;
    }
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/onboarding",
      });
    } catch (err: any) {
      alert("Google Sign Up Error: " + (err.errors?.[0]?.message || err.message || JSON.stringify(err)));
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!signIn) throw new Error("Clerk SignIn not loaded");
        const { supportedFirstFactors } = await signIn.create({
          identifier: emailAddress,
        });

        const isEmailCodeFactor = (factor: any) => factor.strategy === 'email_code';
        const emailCodeFactor = supportedFirstFactors?.find(isEmailCodeFactor);

        if (emailCodeFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            // @ts-ignore
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setPendingVerification(true);
        } else {
          setErrorMsg("Email OTP is not supported. Please check Clerk Dashboard -> User & Authentication -> Email address -> Enable 'Email verification code'.");
        }
      } else {
        if (!signUp) throw new Error("Clerk SignUp not loaded");
        await signUp.create({
          emailAddress,
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.errors?.[0]?.message || err.message || "An error occurred during email auth.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!signIn) throw new Error("Clerk SignIn not loaded");
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code,
        });
        if (result.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
          router.push('/');
        } else {
          throw new Error("Verification incomplete. Status: " + result.status);
        }
      } else {
        if (!signUp) throw new Error("Clerk SignUp not loaded");
        const result = await signUp.attemptEmailAddressVerification({
          code,
        });
        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId });
          router.push('/onboarding');
        } else {
           throw new Error("Verification incomplete. Status: " + result.status);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let renderer: any;
    let geometry: any;
    let material: any;
    let scene: any;
    let camera: any;
    let animationId: number;

    const initThree = (THREE: any) => {
      if (!canvasRef.current || !active) return;
      const canvas = canvasRef.current;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2) },
        u_opacities: { value: [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0] },
        u_colors: { value: [
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(1, 1, 1),
          new THREE.Vector3(1, 1, 1)
        ] },
        u_total_size: { value: 20.0 },
        u_dot_size: { value: 6.0 },
        u_reverse: { value: 0 }
      };

      material = new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;
          void main() {
            gl_Position = vec4(position, 1.0);
            fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: `
          precision mediump float;
          in vec2 fragCoord;

          uniform float u_time;
          uniform float u_opacities[10];
          uniform vec3 u_colors[6];
          uniform float u_total_size;
          uniform float u_dot_size;
          uniform vec2 u_resolution;
          uniform int u_reverse;

          out vec4 fragColor;

          float PHI = 1.61803398874989484820459;
          float random(vec2 xy) {
              return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
          }

          void main() {
              vec2 st = fragCoord.xy;
              st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
              st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

              float opacity = step(0.0, st.x) * step(0.0, st.y);

              vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

              float frequency = 5.0;
              float show_offset = random(st2);
              float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
              opacity *= u_opacities[int(rand * 10.0)];
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
              opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

              vec3 color = u_colors[int(show_offset * 6.0)];

              float animation_speed_factor = 3.0;
              vec2 center_grid = u_resolution / 2.0 / u_total_size;
              float dist_from_center = distance(center_grid, st2);

              float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

              float current_timing_offset = timing_offset_intro;
              opacity *= step(current_timing_offset, u_time * animation_speed_factor);
              opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);

              fragColor = vec4(color, opacity);
              fragColor.rgb *= fragColor.a;
          }
        `,
        uniforms: uniforms,
        glslVersion: THREE.GLSL3,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        transparent: true
      });

      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const startTime = performance.now();
      const animate = () => {
        if (!active) return;
        animationId = requestAnimationFrame(animate);
        uniforms.u_time.value = (performance.now() - startTime) / 1000.0;
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.u_resolution.value.set(window.innerWidth * 2, window.innerHeight * 2);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    if ((window as any).THREE) {
      const cleanUp = initThree((window as any).THREE);
      return () => {
        active = false;
        if (cleanUp) cleanUp();
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) renderer.dispose();
        if (geometry) geometry.dispose();
        if (material) material.dispose();
      };
    } else {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).THREE) {
          const cleanUp = initThree((window as any).THREE);
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      active = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) renderer.dispose();
      if (geometry) geometry.dispose();
      if (material) material.dispose();
    };
  }, []);

  const socialBtn: React.CSSProperties = {
    width:"100%", padding:"0.65rem", borderRadius:6,
    border:"1px solid #333", background:"transparent", color:"#fff",
    fontWeight:500, fontSize:"0.875rem", cursor:"pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem",
    marginBottom:"0.4rem",
  };

  const input: React.CSSProperties = {
    width:"100%", padding:"0.65rem 0.85rem", borderRadius:6,
    border:"1px solid #333", background:"#000", color:"#fff",
    fontSize:"0.875rem", outline:"none",
  };

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" style={{width:16,height:16,flexShrink:0}}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const GitHubIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16,flexShrink:0}}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );

  const Logo = (
    <div style={{background:"#111",width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"1.15rem",marginBottom:"0.75rem",border:"1px solid #333"}}>CV</div>
  );
  const Footer = (
    <div style={{marginTop:"0.85rem",fontSize:"0.75rem",color:"#666",lineHeight:1.5,textAlign:"center"}}>
      By proceeding, you agree to creating a CodeViit account<br/>subject to our{" "}
      <a href="#" style={{color:"#888"}}>Terms of Service</a> and <a href="#" style={{color:"#888"}}>Privacy Policy</a>.
    </div>
  );

  return (
    <div style={{position:"relative",width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#000",color:"#fff",fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,zIndex:0}}/>
      <div style={{position:"absolute",inset:0,zIndex:1,background:"radial-gradient(circle at center,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0) 100%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",zIndex:2,background:"#121212",borderRadius:12,padding:"2rem",width:"100%",maxWidth:400,boxShadow:"0 10px 40px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column",alignItems:"center",border:"1px solid #222"}}>
        {pendingVerification ? (
          <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
            {Logo}
            <h1 style={{fontSize:"1.35rem",fontWeight:600,marginBottom:"0.25rem",letterSpacing:"-0.025em"}}>Check your Email</h1>
            <p style={{fontSize:"0.85rem",color:"#888",marginBottom:"0.85rem",lineHeight:1.5}}>We sent a 6-digit code to {emailAddress}.</p>

            {errorMsg && <div style={{width:"100%",padding:"0.5rem",background:"#310",color:"#f55",borderRadius:6,marginBottom:"0.75rem",fontSize:"0.8rem"}}>{errorMsg}</div>}

            <form onSubmit={handleVerify} style={{width:"100%",display:"flex",flexDirection:"column",gap:"0.65rem"}}>
              <input 
                style={input} 
                type="text" 
                placeholder="123456" 
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                required
              />
              <button type="submit" disabled={isLoading} style={{width:"100%",padding:"0.65rem",borderRadius:6,border:"none",background:"#ededed",color:"#000",fontWeight:500,fontSize:"0.875rem",cursor:isLoading?"not-allowed":"pointer", opacity: isLoading?0.7:1}}>
                {isLoading ? "Verifying..." : "Verify Code"}
              </button>
            </form>
            
            <div style={{marginTop:"1.25rem",fontSize:"0.875rem",color:"#888"}}>
              <button onClick={()=>setPendingVerification(false)} style={{color:"#fff",fontWeight:500,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:"inherit"}}>Go back</button>
            </div>
          </div>
        ) : isLogin ? (
          <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
            {Logo}
            <h1 style={{fontSize:"1.35rem",fontWeight:600,marginBottom:"0.25rem",letterSpacing:"-0.025em"}}>Sign in to CodeViit</h1>
            <p style={{fontSize:"0.85rem",color:"#888",marginBottom:"0.85rem",lineHeight:1.5}}>Sign in to your Account.</p>

            {errorMsg && <div style={{width:"100%",padding:"0.5rem",background:"#310",color:"#f55",borderRadius:6,marginBottom:"0.75rem",fontSize:"0.8rem"}}>{errorMsg}</div>}

            <form onSubmit={handleEmailAuth} style={{width:"100%",display:"flex",flexDirection:"column",gap:"0.65rem"}}>
              <input style={input} type="email" placeholder="name@work-email.com" value={emailAddress} onChange={e=>setEmailAddress(e.target.value)} required/>
              <button type="submit" disabled={isLoading} style={{width:"100%",padding:"0.65rem",borderRadius:6,border:"none",background:"#ededed",color:"#000",fontWeight:500,fontSize:"0.875rem",cursor:isLoading?"not-allowed":"pointer", opacity: isLoading?0.7:1}}>
                {isLoading ? "Sending code..." : "Continue with Email"}
              </button>
            </form>

            <div style={{height:1,background:"#222",width:"100%",margin:"0.85rem 0"}}/>

            <button onClick={handleGoogleSignIn} style={socialBtn}>{GoogleIcon}Continue with Google</button>
            <button onClick={() => alert("GitHub sign in not configured yet.")} style={{...socialBtn,marginBottom:0}}>{GitHubIcon}Continue with GitHub</button>

            <div style={{marginTop:"1.25rem",fontSize:"0.875rem",color:"#888"}}>
              Don't have an account?{" "}
              <button onClick={()=>{setIsLogin(false);setErrorMsg("")}} style={{color:"#fff",fontWeight:500,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:"inherit"}}>Sign Up</button>
            </div>
            {Footer}
          </div>
        ) : (
          <div style={{width:"100%",maxWidth:360,display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
            {Logo}
            <h1 style={{fontSize:"1.35rem",fontWeight:600,marginBottom:"0.25rem",letterSpacing:"-0.025em"}}>Sign up for CodeViit</h1>
            <p style={{fontSize:"0.85rem",color:"#888",marginBottom:"0.85rem",lineHeight:1.5}}>Create a new account to get started.</p>

            {errorMsg && <div style={{width:"100%",padding:"0.5rem",background:"#310",color:"#f55",borderRadius:6,marginBottom:"0.75rem",fontSize:"0.8rem"}}>{errorMsg}</div>}

            <form onSubmit={handleEmailAuth} style={{width:"100%",display:"flex",flexDirection:"column",gap:"0.65rem"}}>
              <input style={input} type="email" placeholder="name@work-email.com" value={emailAddress} onChange={e=>setEmailAddress(e.target.value)} required/>
              <button type="submit" disabled={isLoading} style={{width:"100%",padding:"0.65rem",borderRadius:6,border:"none",background:"#ededed",color:"#000",fontWeight:500,fontSize:"0.875rem",cursor:isLoading?"not-allowed":"pointer", opacity: isLoading?0.7:1}}>
                {isLoading ? "Sending code..." : "Sign Up with Email"}
              </button>
            </form>

            <div style={{height:1,background:"#222",width:"100%",margin:"0.85rem 0"}}/>

            <button onClick={handleGoogleSignUp} style={socialBtn}>{GoogleIcon}Sign up with Google</button>
            <button onClick={() => alert("GitHub sign up not configured yet.")} style={{...socialBtn,marginBottom:0}}>{GitHubIcon}Sign up with GitHub</button>

            <div style={{marginTop:"1.25rem",fontSize:"0.875rem",color:"#888"}}>
              Already have an account?{" "}
              <button onClick={()=>{setIsLogin(true);setErrorMsg("")}} style={{color:"#fff",fontWeight:500,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit",fontSize:"inherit"}}>Sign In</button>
            </div>
            {Footer}
          </div>
        )}
      </div>
    </div>
  );
}
