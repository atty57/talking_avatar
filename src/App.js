import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';

import { LinearEncoding, sRGBEncoding } from 'three/src/constants';
import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';
import ReactAudioPlayer from 'react-audio-player';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import * as THREE from 'three';
import axios from 'axios';
const _ = require('lodash');

const host = 'http://localhost:3001'

function Avatar({ avatar_url, speak, setSpeak, text, setAudioSource, playing }) {

  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  const [ 
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture,
    teethNormalTexture,
    // teethSpecularTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
    ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    // "/images/teeth_specular.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuse.webp",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each([
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    teethNormalTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture, 
    tshirtDiffuseTexture, 
    tshirtNormalTexture, 
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture
  ], t => {
    t.encoding = sRGBEncoding;
    t.flipY = false;
  });

  bodyNormalTexture.encoding = LinearEncoding;
  tshirtNormalTexture.encoding = LinearEncoding;
  teethNormalTexture.encoding = LinearEncoding;
  hairNormalTexture.encoding = LinearEncoding;

  
  gltf.scene.traverse(node => {
    if(node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;

      if (node.name.includes("Body")) {
        node.castShadow = true;
        node.receiveShadow = true;

        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        // node.material.shininess = 60;
        node.material.roughness = 1.7;

        // node.material.specularMap = bodySpecularTexture;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);

        morphTargetDictionaryBody = node.morphTargetDictionary;

        node.material.envMapIntensity = 0.8;
        // node.material.visible = false;
      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        // node.material.shininess = 100;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;
      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({color: 0x000000});
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {
        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;
        node.material.envMapIntensity = 0.7;
      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;
        
        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);
        
        node.material.envMapIntensity = 0.3;
      }

      if (node.name.includes("TSHIRT")) {
        node.material = new MeshStandardMaterial();

        node.material.map = tshirtDiffuseTexture;
        node.material.roughnessMap = tshirtRoughnessTexture;
        node.material.normalMap = tshirtNormalTexture;
        node.material.color.setHex(0xffffff);

        node.material.envMapIntensity = 0.5;
      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
      }
    }
  });

  const [clips, setClips] = useState([]);
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), []);

  useEffect(() => {
    if (speak === false)
      return;

    makeSpeech(text)
    .then(response => {
      let {blendData, filename, generatedText} = response.data;

      let newClips = [ 
        createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'), 
        createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower') ];

      filename = host + filename;
        
      setClips(newClips);
      setAudioSource(filename);
    })
    .catch(err => {
      console.error(err);
      setSpeak(false);
    })
  }, [speak]);

  let idleFbx = useFBX('/idle.fbx');
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, track => {
    return track.name.includes("Head") || track.name.includes("Neck") || track.name.includes("Spine2");
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, track => {
    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }

    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }

    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }

    return track;
  });

  useEffect(() => {
    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();

    let blinkClip = createAnimation(blinkData, morphTargetDictionaryBody, 'HG_Body');
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();
  }, []);

  // Play animation clips when available
  useEffect(() => {
    if (playing === false)
      return;
    
    _.each(clips, clip => {
        let clipAction = mixer.clipAction(clip);
        clipAction.setLoop(THREE.LoopOnce);
        clipAction.play();
    });
  }, [playing]);
  
  useFrame((state, delta) => {
    mixer.update(delta);
  });

  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

function makeSpeech(text, useAI = false, prompt = "", model = null) {
  return axios.post(host + '/talk', { 
    text,
    useAI,
    prompt: prompt || text,
    model
  });
}

const STYLES = {
  container: {
    position: 'absolute',
    bottom: '30px',
    left: '30px',  // Changed from 50% and transform to position on the left
    width: '350px',
    maxWidth: '350px',
    zIndex: 500,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    background: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(10px)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    background: 'rgba(14, 116, 144, 0.9)',
    color: 'white',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px'
  },
avatar: {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'white',
  marginRight: '12px',
  fontWeight: 'bold',
  fontSize: '22px', // Slightly increased size for better visibility
  color: 'rgba(14, 116, 144, 1)'
},
  headerText: {
    margin: 0,
    fontWeight: '600',
    fontSize: '18px'
  },
  statusBadge: {
    marginLeft: 'auto',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white'
  },
  conversationContainer: {
    maxHeight: '250px',
    overflowY: 'auto',
    padding: '15px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  messageUser: {
    alignSelf: 'flex-end',
    background: 'rgba(14, 116, 144, 0.9)',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '18px 18px 4px 18px',
    maxWidth: '85%',
    wordBreak: 'break-word',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
  },
  messageAssistant: {
    alignSelf: 'flex-start',
    background: 'rgba(51, 65, 85, 0.8)',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '18px 18px 18px 4px',
    maxWidth: '85%',
    wordBreak: 'break-word',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
  },
  responseArea: {
    padding: '15px 20px'
  },
  currentResponseBox: {
    background: 'rgba(51, 65, 85, 0.5)',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '12px',
    color: '#94a3b8',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    position: 'relative'
  },
  input: {
    flex: '1',
    padding: '14px',
    paddingRight: '50px',
    background: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    resize: 'none',
    fontFamily: 'inherit'
  },
  sendButton: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(14, 116, 144, 0.9)',
    color: 'white',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  sendButtonDisabled: {
    position: 'absolute',
    right: '10px',
    bottom: '10px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(100, 116, 139, 0.3)',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'not-allowed'
  },
  sendIcon: {
    width: '20px',
    height: '20px',
    fill: 'currentColor'
  },
  loadingDots: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '20px'
  },
  dot: {
    width: '4px',
    height: '4px',
    margin: '0 2px',
    borderRadius: '50%',
    background: 'white',
    animation: 'bounce 1.5s infinite ease-in-out'
  },
  infoSection: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center'
  },
  hiddenControls: {
    display: 'none'
  }
};

function App() {
  const audioPlayer = useRef();

  const [speak, setSpeak] = useState(false);
  const [text, setText] = useState("Hello, I'm a Virtual Dr. , your medical assistant. How can I help you today?");
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  
  // State variables for LLM integration
  const [useAI, setUseAI] = useState(true); // Set to true by default for medical assistant
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3.2");
  
  // Conversation history for medical context
  const [conversationHistory, setConversationHistory] = useState([]);
  const conversationContainerRef = useRef(null);

  // Scroll conversation to bottom whenever it changes
  useEffect(() => {
    if (conversationContainerRef.current) {
      const element = conversationContainerRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [conversationHistory]);

  // End of play
  function playerEnded(e) {
    setAudioSource(null);
    setSpeak(false);
    setPlaying(false);
  }

  // Player is ready
  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);
  }

  // Handle the speak button click - fixed to prevent double API calls
  const handleSpeak = () => {
    // Add user input to conversation history
    if (prompt) {
      setConversationHistory([...conversationHistory, {
        role: 'user',
        content: prompt
      }]);
    }
    
    if (useAI) {
      setIsGenerating(true);
    } else {
      setSpeak(true);
    }
  }

  // Effect to handle LLM text generation
  useEffect(() => {
    if (!isGenerating) return;
    console.log("Generating AI response with:", { prompt: prompt || text, model: selectedModel });

    axios.post(host + '/talk', { 
      text,
      useAI: true,
      prompt: prompt || text,
      model: selectedModel
    })
    .then(response => {
      setIsGenerating(false);
      
      if (response.data.generatedText) {
        // Update the text with the AI-generated response
        setText(response.data.generatedText);
        
        // Add AI response to conversation history
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          content: response.data.generatedText
        }]);
        
        // Now trigger the speak action with the generated text
        setSpeak(true);
        
        // Clear the prompt field after generating
        setPrompt("");
      }
    })
    .catch(err => {
      console.error("Error generating response:", err);
      setIsGenerating(false);
    });
  }, [isGenerating]);

  // Render the send button with appropriate state
  const renderSendButton = () => {
    const isDisabled = speak || isGenerating || !prompt.trim();
    const buttonStyle = isDisabled ? STYLES.sendButtonDisabled : STYLES.sendButton;
    
    if (isGenerating) {
      return (
        <div style={buttonStyle}>
          <div style={STYLES.loadingDots}>
            <span style={{...STYLES.dot, animationDelay: '0s'}}></span>
            <span style={{...STYLES.dot, animationDelay: '0.2s'}}></span>
            <span style={{...STYLES.dot, animationDelay: '0.4s'}}></span>
          </div>
        </div>
      );
    }
    
    return (
      <button 
        onClick={handleSpeak} 
        style={buttonStyle} 
        disabled={isDisabled}
      >
        <svg style={STYLES.sendIcon} viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    );
  };

  return (
    <div className="full">
      <ReactAudioPlayer
        src={audioSource}
        ref={audioPlayer}
        onEnded={playerEnded}
        onCanPlayThrough={playerReady}
      />
      
      <Canvas dpr={2} onCreated={(ctx) => {
          ctx.gl.physicallyCorrectLights = false;
        }}>

        <OrthographicCamera 
          makeDefault
          zoom={2000}
          position={[0, 1.65, 1]}
        />

        <Suspense fallback={null}>
          <Environment background={false} files="/images/photo_studio_loft_hall_1k.hdr" />
        </Suspense>

        <Suspense fallback={null}>
          <Bg />
        </Suspense>

        <Suspense fallback={null}>
          <Avatar 
            avatar_url="/model.glb" 
            speak={speak} 
            setSpeak={setSpeak}
            text={text}
            setAudioSource={setAudioSource}
            playing={playing}
          />
        </Suspense>
      </Canvas>
      
      <div style={STYLES.container}>
        <div style={STYLES.header}>
          <div style={STYLES.avatar}>⚕️</div>
          <h3 style={STYLES.headerText}>Virtual Medical Assistant</h3>
          <div style={STYLES.statusBadge}>
            {isGenerating ? 'Analyzing...' : speak ? 'Speaking...' : 'Ready'}
          </div>
        </div>
        
        <div style={STYLES.conversationContainer} ref={conversationContainerRef}>
          {conversationHistory.length === 0 ? (
            <div style={STYLES.messageAssistant}>
              Hello, I'm your Virtual Medical Assistant. I'm here to help understand your symptoms and provide guidance. How can I help you today?
            </div>
          ) : (
            conversationHistory.map((message, index) => (
              <div 
                key={index} 
                style={message.role === 'user' ? STYLES.messageUser : STYLES.messageAssistant}
              >
                {message.content}
              </div>
            ))
          )}
          
          {isGenerating && (
            <div style={{...STYLES.messageAssistant, background: 'rgba(51, 65, 85, 0.5)'}}>
              <div style={STYLES.loadingDots}>
                <span style={{...STYLES.dot, animationDelay: '0s'}}></span>
                <span style={{...STYLES.dot, animationDelay: '0.2s'}}></span>
                <span style={{...STYLES.dot, animationDelay: '0.4s'}}></span>
              </div>
            </div>
          )}
        </div>
        
        <div style={STYLES.responseArea}>
          <div style={STYLES.inputContainer}>
            <textarea 
              rows={2}
              style={STYLES.input} 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              placeholder="Describe your symptoms or ask a question..."
              disabled={isGenerating || speak}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!(speak || isGenerating || !prompt.trim())) {
                    handleSpeak();
                  }
                }
              }}
            />
            {renderSendButton()}
          </div>
        </div>
        
        <div style={STYLES.infoSection}>
          This is a virtual medical consultation. For medical emergencies, please call 911 or go to your nearest emergency room.
        </div>
        
        {/* Hidden controls for AI functionality - keep these for the backend functionality */}
        <div style={STYLES.hiddenControls}>
          <input 
            type="checkbox" 
            id="useAI" 
            checked={useAI} 
            onChange={(e) => setUseAI(e.target.checked)} 
          />
          
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="llama3.2">Clinical Expert</option>
            <option value="llama3">Medical Specialist</option>
            <option value="phi3">General Practitioner</option>
          </select>
        </div>
      </div>
      
      <Loader dataInterpolation={(p) => `Loading... please wait`} />
    </div>
  );
}

function Bg() {
  const texture = useTexture('/images/bg.webp');

  return(
    <mesh position={[0.02, 1.56, -2]} scale={[1, 1, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

export default App;