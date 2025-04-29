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
  area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500, width: '320px'},
  text: {margin: '0px', width:'100%', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.2em', border: 'none', resize: 'vertical'},
  speak: {padding: '10px', marginTop: '5px', display: 'block', width: '100%', color: '#FFFFFF', background: '#1a73e8', border: 'None', cursor: 'pointer', borderRadius: '4px'},
  speakDisabled: {padding: '10px', marginTop: '5px', display: 'block', width: '100%', color: '#AAAAAA', background: '#333333', border: 'None', cursor: 'not-allowed', borderRadius: '4px'},
  area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500},
  label: {color: '#777777', fontSize:'0.8em'},
  aiControl: {marginTop: '10px', display: 'flex', alignItems: 'center', color: '#ffffff'},
  aiLabel: {marginRight: '10px', fontSize: '0.9em', color: '#aaaaaa'},
  promptArea: {marginTop: '10px'},
  promptText: {margin: '0px', width:'100%', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1em', border: 'none', resize: 'vertical'},
  modelSelector: {marginLeft: '10px', background: '#333333', color: '#ffffff', border: 'none', padding: '3px', borderRadius: '3px'},
  // New medical assistant styles
  medicalBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    background: 'rgba(0,100,200,0.7)',
    padding: '5px 10px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    zIndex: 500
  },
  medicalIcon: {
    fontSize: '1.2em',
    marginRight: '5px'
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '0.9em'
  },
  infoBox: {
    background: 'rgba(0,0,0,0.5)',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '10px'
  },
  infoTitle: {
    color: '#ffffff',
    margin: '0 0 5px 0',
    fontSize: '1.2em'
  },
  infoText: {
    color: '#cccccc',
    margin: '0',
    fontSize: '0.9em',
    lineHeight: '1.4'
  },
  conversationHistory: {
    marginBottom: '10px', 
    maxHeight: '150px', 
    overflowY: 'auto',
    background: 'rgba(0,0,0,0.3)',
    padding: '8px',
    borderRadius: '5px'
  },
  historyMessage: {
    marginBottom: '8px',
    fontSize: '0.9em',
    color: '#cccccc'
  },
  userMessage: {
    color: '#ffffff',
    fontWeight: 'bold'
  }
}

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

  // Get button style based on disable state
  const getButtonStyle = () => {
    if (speak || isGenerating) {
      return STYLES.speakDisabled;
    }
    return STYLES.speak;
  }

  // Get button text based on state
  const getButtonText = () => {
    if (isGenerating) return 'Analyzing your symptoms...';
    if (speak) return 'Speaking...';
    return 'Consult';
  }

  return (
    <div className="full">
      {/* Medical Badge */}
      <div style={STYLES.medicalBadge}>
        <span style={STYLES.medicalIcon}>⚕️</span>
        <span style={STYLES.badgeText}>Medical Assistant</span>
      </div>
      
      <div style={STYLES.area}>
        {/* Info Box */}
        <div style={STYLES.infoBox}>
          <h3 style={STYLES.infoTitle}>Virtual Medical Consultation</h3>
          <p style={STYLES.infoText}>
            I'm a clinical expert designed to understand your symptoms and provide medical guidance. 
            Please describe your symptoms in detail for me to better understand your situation.
          </p>
        </div>
        
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div style={STYLES.conversationHistory}>
            {conversationHistory.map((message, index) => (
              <div key={index} style={STYLES.historyMessage}>
                <span style={message.role === 'user' ? STYLES.userMessage : null}>
                  {message.role === 'user' ? 'You: ' : 'Virtual Dr. : '}
                </span>
                {message.content}
              </div>
            ))}
          </div>
        )}
      
        {/* Current AI Response */}
        <textarea 
          rows={4} 
          type="text" 
          style={STYLES.text} 
          value={text} 
          onChange={(e) => setText(e.target.value.substring(0, 500))} 
          placeholder="Current assistant response..."
          disabled={true}
          readOnly
        />
        
        {/* User Input Area */}
        <div style={STYLES.promptArea}>
          <textarea 
            rows={3} 
            type="text" 
            style={STYLES.promptText} 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            placeholder="Describe your symptoms or ask a health question..."
            disabled={isGenerating || speak}
          />
        </div>
        
        {/* Model Selection (Hidden in UI but kept for functionality) */}
        <div style={{display: 'none'}}>
          <input 
            type="checkbox" 
            id="useAI" 
            checked={useAI} 
            onChange={(e) => setUseAI(e.target.checked)} 
            disabled={isGenerating || speak}
          />
          
          <select 
            style={STYLES.modelSelector} 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isGenerating || speak}
          >
            <option value="" disabled>Select a model</option>
            <option value="llama3.2">Clinical Expert</option>
            <option value="llama3">Medical Specialist</option>
            <option value="phi3">General Practitioner</option>
          </select>
        </div>
        
        {/* Speak/Consult Button */}
        <button 
          onClick={handleSpeak} 
          style={getButtonStyle()} 
          disabled={speak || isGenerating || !prompt.trim()}
        > 
          {getButtonText()} 
        </button>
      </div>

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