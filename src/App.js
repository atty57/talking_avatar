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

function Avatar({ avatar_url, speak, setSpeak, text, setAudioSource, playing, visemeSettings, voiceParams }) {

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
    if (node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {
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
        node.material = new LineBasicMaterial({ color: 0x000000 });
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

    makeSpeech(text, visemeSettings, false, "", null, voiceParams)
      .then(response => {
        let { blendData, filename, generatedText } = response.data;

        let newClips = [
          createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
          createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower')];

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

function makeSpeech(text, visemeSettings = {}, useAI = false, prompt = "", model = null, voiceParams = {}) {
  return axios.post(host + '/talk', {
    text,
    useAI,
    prompt: prompt || text,
    model,
    // Include voice parameters
    voiceName: voiceParams.voiceName,
    voiceStyle: voiceParams.voiceStyle,
    // Include viseme settings
    ...visemeSettings
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
  },
  visemeControls: {
    padding: '10px 20px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)',
    fontSize: '12px',
    color: '#fff',
  },
  visemeControlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  visemeLabel: {
    flexBasis: '40%',
  },
  visemeInput: {
    flexBasis: '55%',
    background: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    padding: '4px 8px'
  },
  checkbox: {
    margin: '0 0 0 auto',
  },
  advancedToggle: {
    color: 'rgba(14, 116, 144, 0.9)',
    background: 'none',
    border: 'none',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'block',
    margin: '8px auto',
    padding: '4px'
  },
  voiceControls: {
    padding: '10px 20px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)',
    fontSize: '12px',
    color: '#fff',
  },
  voiceControlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  voiceLabel: {
    flexBasis: '40%',
  },
  voiceSelect: {
    flexBasis: '55%',
    background: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    padding: '6px 8px',
    fontSize: '12px'
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
  const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");

  // Conversation history for medical context
  const [conversationHistory, setConversationHistory] = useState([]);
  const conversationContainerRef = useRef(null);

  // State for viseme fine-tuning
  const [visemeSettings, setVisemeSettings] = useState({
    visemeIntensity: 1,
    visemeSmoothing: true,
    addIdleVisemes: true,
    visemeEmphasis: {
      "mouthOpen": 1.3,
      "jawOpen": 1.3,
      "mouthSmileLeft": 1.2,
      "mouthSmileRight": 1.2,
      "eyeSquintLeft": 0.8,
      "eyeSquintRight": 0.8
    }
  });

  // Voice selection state
  const [voiceParams, setVoiceParams] = useState({
    voiceName: "en-US-AriaNeural",
    voiceStyle: "empathetic"
  });

  // Available voices (all female neural voices)
  const availableVoices = [
    { id: "en-US-AriaNeural", name: "Aria (Versatile)" },
    { id: "en-US-JennyNeural", name: "Jenny (Conversational)" },
    { id: "en-US-SaraNeural", name: "Sara (Professional)" },
    { id: "en-US-ElizabethNeural", name: "Elizabeth (Warm)" },
    { id: "en-US-NancyNeural", name: "Nancy (Friendly)" },
    { id: "en-US-MichelleNeural", name: "Michelle (Calm)" }
  ];

  // Available speaking styles
  const availableStyles = [
    { id: "empathetic", name: "Empathetic" },
    { id: "cheerful", name: "Cheerful" },
    { id: "friendly", name: "Friendly" },
    { id: "hopeful", name: "Hopeful" },
    { id: "sad", name: "Sad" },
    { id: "excited", name: "Excited" }
  ];

  // Toggle for showing advanced viseme controls
  const [showAdvancedVisemeControls, setShowAdvancedVisemeControls] = useState(false);

  // STT state and logic
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Add username state
  const [username, setUsername] = useState("");
  const [awaitingName, setAwaitingName] = useState(true);

  // Add state for temperature and max tokens
  const [gptTemperature, setGptTemperature] = useState(0.7);
  const [gptMaxTokens, setGptMaxTokens] = useState(256);

  // On first load, set initial conversation with Dr. Ava asking for the name
  useEffect(() => {
    setConversationHistory([
      { role: 'assistant', content: "Hello! I'm Dr. Ava, your virtual medical assistant. What's your name?" }
    ]);
    setAwaitingName(true);
    setUsername("");
  }, []);

  useEffect(() => {
    // Setup recognition only once
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      setIsListening(false);
      // Automatically send the message after speech is recognized
      setTimeout(() => {
        setPrompt(t => {
          if (t && t.trim()) handleSpeak();
          return t;
        });
      }, 100);
    };
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !(isGenerating || speak)) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

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
    // Automatically start listening again after response
    setTimeout(() => {
      if (recognitionRef.current && !isListening && !(isGenerating || speak)) {
        setIsListening(true);
        recognitionRef.current.start();
      }
    }, 500);
  }

  // Player is ready
  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);
  }

  // Update handleSpeak to handle name collection
  const handleSpeak = () => {
    if (prompt) {
      if (awaitingName) {
        // First user message is their name
        const name = prompt.trim();
        setUsername(name);
        setAwaitingName(false);
        const greeting = `Nice to meet you, ${name}! How can I help you today?`;
        setConversationHistory(prev => ([
          ...prev,
          { role: 'user', content: name },
          { role: 'assistant', content: greeting }
        ]));
        setText(greeting);      // Set the greeting as the text to be spoken
        setSpeak(true);         // Trigger the avatar to speak
        setPrompt("");
        return;
      } else {
        setConversationHistory([...conversationHistory, {
          role: 'user',
          content: prompt
        }]);
      }
    }
    if (useAI && !awaitingName) {
      setIsGenerating(true);
    } else if (!awaitingName) {
      setSpeak(true);
    }
  }

  // Pass temperature and max tokens to askGpt35 and backend
  async function askGpt35(question, history, username, model, temperature, max_tokens) {
    try {
      const response = await axios.post(host + '/ask_gpt', { question, history, username, model, temperature, max_tokens });
      return response.data.answer;
    } catch (err) {
      console.error('Error calling /ask_gpt:', err);
      throw err;
    }
  }

  // In useEffect, pass gptTemperature and gptMaxTokens to askGpt35
  useEffect(() => {
    if (!isGenerating) return;
    if (awaitingName) return;
    console.log("Generating AI response with:", { prompt: prompt || text, model: selectedModel, username, temperature: gptTemperature, max_tokens: gptMaxTokens });

    if (selectedModel.startsWith('gpt-')) {
      askGpt35(prompt || text, conversationHistory, username, selectedModel, gptTemperature, gptMaxTokens)
        .then(answer => {
          setIsGenerating(false);
          if (answer) {
            setText(answer);
            setConversationHistory(prev => [...prev, {
              role: 'assistant',
              content: answer
            }]);
            setSpeak(true);
            setPrompt("");
          }
        })
        .catch(err => {
          setIsGenerating(false);
        });
    } else {
      // Use existing /talk endpoint for other models
      axios.post(host + '/talk', {
        text,
        useAI: true,
        prompt: prompt || text,
        model: selectedModel,
        voiceName: voiceParams.voiceName,
        voiceStyle: voiceParams.voiceStyle,
        ...visemeSettings
      })
        .then(response => {
          setIsGenerating(false);
          if (response.data.generatedText) {
            setText(response.data.generatedText);
            setConversationHistory(prev => [...prev, {
              role: 'assistant',
              content: response.data.generatedText
            }]);
            setSpeak(true);
            setPrompt("");
          }
        })
        .catch(err => {
          console.error("Error generating response:", err);
          setIsGenerating(false);
        });
    }
  }, [isGenerating]);

  // Handle changes to viseme intensity
  const handleVisemeIntensityChange = (e) => {
    setVisemeSettings({
      ...visemeSettings,
      visemeIntensity: parseFloat(e.target.value)
    });
  };

  // Handle toggling of viseme smoothing
  const handleVisemeSmoothingChange = (e) => {
    setVisemeSettings({
      ...visemeSettings,
      visemeSmoothing: e.target.checked
    });
  };

  // Handle toggling of idle visemes
  const handleIdleVisemesChange = (e) => {
    setVisemeSettings({
      ...visemeSettings,
      addIdleVisemes: e.target.checked
    });
  };

  // Handle changes to specific viseme emphasis values
  const handleVisemeEmphasisChange = (key, value) => {
    setVisemeSettings({
      ...visemeSettings,
      visemeEmphasis: {
        ...visemeSettings.visemeEmphasis,
        [key]: parseFloat(value)
      }
    });
  };

  // Render the voice controls section
  const renderVoiceControls = () => {
    return (
      <div style={STYLES.voiceControls}>
        <h4 style={{ margin: '0 0 10px 0' }}>Voice Settings</h4>
        
        <div style={STYLES.voiceControlRow}>
          <label style={STYLES.voiceLabel}>Voice:</label>
          <select 
            value={voiceParams.voiceName} 
            onChange={(e) => setVoiceParams({...voiceParams, voiceName: e.target.value})}
            style={STYLES.voiceSelect}
            disabled={isGenerating || speak}
          >
            {availableVoices.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>
        </div>
        
        <div style={STYLES.voiceControlRow}>
          <label style={STYLES.voiceLabel}>Speaking Style:</label>
          <select 
            value={voiceParams.voiceStyle} 
            onChange={(e) => setVoiceParams({...voiceParams, voiceStyle: e.target.value})}
            style={STYLES.voiceSelect}
            disabled={isGenerating || speak}
          >
            {availableStyles.map(style => (
              <option key={style.id} value={style.id}>{style.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // Render the send button with appropriate state
  const renderSendButton = () => {
    const isDisabled = speak || isGenerating || !prompt.trim();
    const buttonStyle = isDisabled ? STYLES.sendButtonDisabled : STYLES.sendButton;

    if (isGenerating) {
      return (
        <div style={buttonStyle}>
          <div style={STYLES.loadingDots}>
            <span style={{ ...STYLES.dot, animationDelay: '0s' }}></span>
            <span style={{ ...STYLES.dot, animationDelay: '0.2s' }}></span>
            <span style={{ ...STYLES.dot, animationDelay: '0.4s' }}></span>
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

  // Render the viseme controls section
  const renderVisemeControls = () => {
    return (
      <div style={STYLES.visemeControls}>
        <h4 style={{ margin: '0 0 10px 0' }}>Expression Controls</h4>

        <div style={STYLES.visemeControlRow}>
          <label style={STYLES.visemeLabel}>Intensity:</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={visemeSettings.visemeIntensity}
            onChange={handleVisemeIntensityChange}
            style={STYLES.visemeInput}
          />
          <span>{visemeSettings.visemeIntensity.toFixed(1)}</span>
        </div>

        <div style={STYLES.visemeControlRow}>
          <label style={STYLES.visemeLabel}>Smooth Transitions:</label>
          <input
            type="checkbox"
            checked={visemeSettings.visemeSmoothing}
            onChange={handleVisemeSmoothingChange}
            style={STYLES.checkbox}
          />
        </div>

        <div style={STYLES.visemeControlRow}>
          <label style={STYLES.visemeLabel}>Idle Expressions:</label>
          <input
            type="checkbox"
            checked={visemeSettings.addIdleVisemes}
            onChange={handleIdleVisemesChange}
            style={STYLES.checkbox}
          />
        </div>

        <button
          style={STYLES.advancedToggle}
          onClick={() => setShowAdvancedVisemeControls(!showAdvancedVisemeControls)}
        >
          {showAdvancedVisemeControls ? "Hide Advanced Controls" : "Show Advanced Controls"}
        </button>

        {showAdvancedVisemeControls && (
          <div>
            <div style={STYLES.visemeControlRow}>
              <label style={STYLES.visemeLabel}>Mouth Open:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={visemeSettings.visemeEmphasis.mouthOpen}
                onChange={(e) => handleVisemeEmphasisChange("mouthOpen", e.target.value)}
                style={STYLES.visemeInput}
              />
              <span>{visemeSettings.visemeEmphasis.mouthOpen.toFixed(1)}</span>
            </div>

            <div style={STYLES.visemeControlRow}>
              <label style={STYLES.visemeLabel}>Jaw Open:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={visemeSettings.visemeEmphasis.jawOpen}
                onChange={(e) => handleVisemeEmphasisChange("jawOpen", e.target.value)}
                style={STYLES.visemeInput}
              />
              <span>{visemeSettings.visemeEmphasis.jawOpen.toFixed(1)}</span>
            </div>

            <div style={STYLES.visemeControlRow}>
              <label style={STYLES.visemeLabel}>Smile Left:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={visemeSettings.visemeEmphasis.mouthSmileLeft}
                onChange={(e) => handleVisemeEmphasisChange("mouthSmileLeft", e.target.value)}
                style={STYLES.visemeInput}
              />
              <span>{visemeSettings.visemeEmphasis.mouthSmileLeft.toFixed(1)}</span>
            </div>

            <div style={STYLES.visemeControlRow}>
              <label style={STYLES.visemeLabel}>Smile Right:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={visemeSettings.visemeEmphasis.mouthSmileRight}
                onChange={(e) => handleVisemeEmphasisChange("mouthSmileRight", e.target.value)}
                style={STYLES.visemeInput}
              />
              <span>{visemeSettings.visemeEmphasis.mouthSmileRight.toFixed(1)}</span>
            </div>

            <div style={STYLES.visemeControlRow}>
              <label style={STYLES.visemeLabel}>Eye Squint:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={visemeSettings.visemeEmphasis.eyeSquintLeft || 0.8}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setVisemeSettings({
                    ...visemeSettings,
                    visemeEmphasis: {
                      ...visemeSettings.visemeEmphasis,
                      eyeSquintLeft: value,
                      eyeSquintRight: value
                    }
                  });
                }}
                style={STYLES.visemeInput}
              />
              <span>{(visemeSettings.visemeEmphasis.eyeSquintLeft || 0.8).toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
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
            visemeSettings={visemeSettings}
            voiceParams={voiceParams}
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
            <div style={{ ...STYLES.messageAssistant, background: 'rgba(51, 65, 85, 0.5)' }}>
              <div style={STYLES.loadingDots}>
                <span style={{ ...STYLES.dot, animationDelay: '0s' }}></span>
                <span style={{ ...STYLES.dot, animationDelay: '0.2s' }}></span>
                <span style={{ ...STYLES.dot, animationDelay: '0.4s' }}></span>
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
            {/* Microphone button for STT */}
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                ...STYLES.sendButton,
                right: '50px',
                background: isListening ? 'rgba(14, 116, 144, 0.5)' : STYLES.sendButton.background
              }}
              disabled={isGenerating || speak}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? (
                // Simple solid circle with a white mic glyph (listening)
                <svg style={STYLES.sendIcon} viewBox="0 0 24 24" fill="#0ea5e9">
                  <circle cx="12" cy="12" r="10" fill="#0ea5e9"/>
                  <path d="M12 7a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V9a2 2 0 0 1 2-2zm5 5a5 5 0 0 1-10 0" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <rect x="11" y="15" width="2" height="3" rx="1" fill="#fff"/>
                </svg>
              ) : (
                // Simple outlined circle with a blue mic glyph (idle)
                <svg style={STYLES.sendIcon} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#0ea5e9" strokeWidth="2" fill="none"/>
                  <path d="M12 7a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V9a2 2 0 0 1 2-2zm5 5a5 5 0 0 1-10 0" stroke="#0ea5e9" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <rect x="11" y="15" width="2" height="3" rx="1" fill="#0ea5e9"/>
                </svg>
              )}
            </button>
            {renderSendButton()}
          </div>
        </div>

        {/* Voice Controls Section */}
        {renderVoiceControls()}

        {/* Viseme Controls Section */}
        {renderVisemeControls()}

        <div style={STYLES.infoSection}>
          This is a virtual medical consultation. For medical emergencies, please call 911 or go to your nearest emergency room.
        </div>

        {/* Move the model selector out of hiddenControls and make it visible above the chat input */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(100, 116, 139, 0.2)', fontSize: '12px', color: '#fff' }}>
          <label htmlFor="model-select" style={{ marginRight: 8 }}>AI Model:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ background: 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '4px', color: 'white', padding: '6px 8px', fontSize: '12px' }}
            disabled={isGenerating || speak}
          >
            <option value="llama3.2">Clinical Expert (Llama3.2)</option>
            <option value="llama3">Medical Specialist (Llama3)</option>
            <option value="phi3">General Practitioner (Phi3)</option>
            <option value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
            <option value="gpt-4">OpenAI GPT-4</option>
            <option value="gpt-4o">OpenAI GPT-4o</option>
          </select>
        </div>

        {/* Add controls for temperature and max tokens below the model selector */}
        <div style={{ padding: '10px 20px', fontSize: '12px', color: '#fff', display: selectedModel.startsWith('gpt-') ? 'block' : 'none' }}>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="temp-slider" style={{ marginRight: 8 }}>Temperature:</label>
            <input
              id="temp-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={gptTemperature}
              onChange={e => setGptTemperature(Number(e.target.value))}
              style={{ verticalAlign: 'middle', width: 120 }}
              disabled={isGenerating || speak}
            />
            <span style={{ marginLeft: 8 }}>{gptTemperature}</span>
          </div>
          <div>
            <label htmlFor="max-tokens" style={{ marginRight: 8 }}>Max Tokens:</label>
            <input
              id="max-tokens"
              type="number"
              min={32}
              max={4096}
              step={1}
              value={gptMaxTokens}
              onChange={e => setGptMaxTokens(Number(e.target.value))}
              style={{ width: 70 }}
              disabled={isGenerating || speak}
            />
          </div>
        </div>
      </div>

      <Loader dataInterpolation={(p) => `Loading... please wait`} />
    </div>
  );
}

function Bg() {
  const texture = useTexture('/images/bg.webp');

  return (
    <mesh position={[0.02, 1.56, -2]} scale={[1, 1, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

export default App;