"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Square, Camera, Check, X } from "lucide-react";
import styles from "./chat.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

interface Message {
  id: string;
  type: "user" | "system" | "confirmation";
  content: string;
  timestamp: Date;
  nutritionData?: {
    macros: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    tip: string;
  };
  confirmationData?: {
    estimatedFood: string;
    estimatedQuantity: string;
    confirmationMessage: string;
  };
  imageUrl?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function NutritionChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "system",
      content:
        "¡Hola! Soy tu asistente nutricional. Podés contarme qué comiste escribiendo, hablando 🎤 o subiendo una foto 📷 de tu comida.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [confirmFood, setConfirmFood] = useState("");
  const [confirmQuantity, setConfirmQuantity] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Verificar si el navegador soporta reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "es-ES";

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessingVoice(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessingVoice(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsProcessingVoice(false);
        setTimeout(() => {
          if (transcript.trim()) {
            handleSendMessage(transcript);
          }
        }, 500);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Error de reconocimiento de voz:", event.error);
        setIsRecording(false);
        setIsProcessingVoice(false);

        let errorMessage = "Error al procesar el audio.";
        switch (event.error) {
          case "no-speech":
            errorMessage = "No se detectó voz. Intentá hablar más claro.";
            break;
          case "audio-capture":
            errorMessage = "No se pudo acceder al micrófono. Verificá que esté conectado.";
            break;
          case "not-allowed":
            errorMessage =
              "Permisos de micrófono denegados. Hacé clic en el ícono del micrófono en la barra de direcciones y permití el acceso.";
            break;
          case "network":
            errorMessage = "Error de conexión. Verificá tu internet.";
            break;
          case "service-not-allowed":
            errorMessage = "El servicio de reconocimiento de voz no está disponible.";
            break;
          default:
            errorMessage = `Error desconocido: ${event.error}. Intentá recargar la página.`;
        }

        const errorMsg: Message = {
          id: Date.now().toString(),
          type: "system",
          content: `❌ ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real API call to /analyze-food
  const analyzeFood = async (input: string | File): Promise<any> => {
    const formData = new FormData();

    if (input instanceof File) {
      formData.append("image", input);
    } else {
      const response = await fetch(`${API_URL}/analyze-food`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return response.json();
    }

    const response = await fetch(`${API_URL}/analyze-food`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  // Real API call to /get-nutrition-info
  const getNutritionInfo = async (food: string, quantity: string): Promise<any> => {
    const response = await fetch(`${API_URL}/get-nutrition-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ food, quantity }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const handleSendMessage = async (messageText?: string, imageUrl?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() && !imageUrl) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: imageUrl ? "📷 Imagen enviada" : textToSend,
      timestamp: new Date(),
      imageUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      let analysisResult;
      if (imageUrl) {
        // Convert base64 to File
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "food-image.jpg", { type: "image/jpeg" });
        analysisResult = await analyzeFood(file);
      } else {
        analysisResult = await analyzeFood(textToSend);
      }

      // Agregar mensaje de confirmación
      const confirmationMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "confirmation",
        content: "Análisis completado. Por favor confirmá los datos:",
        timestamp: new Date(),
        confirmationData: analysisResult,
      };

      setMessages((prev) => [...prev, confirmationMessage]);
      setPendingConfirmation(confirmationMessage.id);
      setConfirmFood(analysisResult.estimatedFood);
      setConfirmQuantity(analysisResult.estimatedQuantity);
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: "system",
        content: "❌ Error al analizar la comida. Intentá nuevamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmFood = async () => {
    if (!confirmFood.trim() || !confirmQuantity.trim()) return;

    setIsLoading(true);
    setPendingConfirmation(null);

    try {
      const nutritionResult = await getNutritionInfo(confirmFood, confirmQuantity);

      // Eliminar el mensaje de confirmación y agregar el mensaje con información nutricional
      setMessages((prev) => {
        const filteredMessages = prev.filter((msg) => msg.type !== "confirmation");
        return [
          ...filteredMessages,
          {
            id: Date.now().toString(),
            type: "system",
            content: `Información nutricional para ${confirmQuantity} de ${confirmFood}`,
            timestamp: new Date(),
            nutritionData: nutritionResult,
          },
        ];
      });
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: "system",
        content: "❌ Error al obtener información nutricional. Intentá nuevamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setConfirmFood("");
      setConfirmQuantity("");
    }
  };

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
    setConfirmFood("");
    setConfirmQuantity("");

    // Eliminar el mensaje de confirmación y agregar el mensaje de cancelación
    setMessages((prev) => {
      const filteredMessages = prev.filter((msg) => msg.type !== "confirmation");
      return [
        ...filteredMessages,
        {
          id: Date.now().toString(),
          type: "system",
          content: "Análisis cancelado. Podés enviar otra comida cuando quieras.",
          timestamp: new Date(),
        },
      ];
    });
  };

  const handleSend = () => {
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        handleSendMessage("Imagen de comida", imageUrl);
      };
      reader.readAsDataURL(file);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMicClick = async () => {
    if (!speechSupported) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: "system",
        content: "❌ Tu navegador no soporta reconocimiento de voz. Probá con Chrome, Edge o Safari actualizado.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    try {
      if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: "system",
          content: "❌ El reconocimiento de voz requiere una conexión segura (HTTPS).",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (permission.state === "denied") {
          const errorMsg: Message = {
            id: Date.now().toString(),
            type: "system",
            content:
              "❌ Permisos de micrófono denegados. Ve a la configuración del navegador y permite el acceso al micrófono para este sitio.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          return;
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaError) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: "system",
          content:
            "❌ No se pudo acceder al micrófono. Asegurate de que esté conectado y que hayas dado permisos al navegador.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      setIsProcessingVoice(true);
      setInputValue("");

      try {
        recognitionRef.current?.start();
      } catch (error) {
        setIsProcessingVoice(false);
        const errorMsg: Message = {
          id: Date.now().toString(),
          type: "system",
          content: "❌ Error al iniciar el reconocimiento de voz. Intentá nuevamente en unos segundos.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      setIsProcessingVoice(false);
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: "system",
        content: "❌ Error inesperado. Recargá la página e intentá nuevamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const getMicIcon = () => {
    if (isRecording) return Square;
    if (isProcessingVoice) return MicOff;
    return Mic;
  };

  const getMicButtonClass = () => {
    if (isRecording) return `${styles.micButton} ${styles.recording}`;
    if (isProcessingVoice) return `${styles.micButton} ${styles.processing}`;
    return styles.micButton;
  };

  const MicIcon = getMicIcon();

  return (
    <div className={styles.container}>
      <div className={styles.chatContainer}>
        <header className={styles.header}>
          <div className={styles.botAvatar}>N</div>
          <div className={styles.headerContent}>
            <h1>NutriBot</h1>
            <p>Asistente nutricional personal</p>
          </div>
        </header>

        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div key={message.id} className={`${styles.messageWrapper} ${styles[message.type]} ${styles.fadeIn}`}>
              <div className={styles.message}>
                {message.type === "user" ? (
                  <div>
                    <p>{message.content}</p>
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl || "/placeholder.svg"}
                        alt="Comida enviada"
                        className={styles.uploadedImage}
                      />
                    )}
                  </div>
                ) : message.type === "confirmation" ? (
                  <div className={styles.confirmationCard}>
                    <p>{message.content}</p>
                    {message.confirmationData && (
                      <div className={styles.confirmationForm}>
                        <p className={styles.confirmationQuestion}>{message.confirmationData.confirmationMessage}</p>

                        <div className={styles.inputGroup}>
                          <label>Comida:</label>
                          <input
                            type="text"
                            value={confirmFood}
                            onChange={(e) => setConfirmFood(e.target.value)}
                            className={styles.confirmInput}
                            disabled={pendingConfirmation !== message.id}
                          />
                        </div>

                        <div className={styles.inputGroup}>
                          <label>Cantidad:</label>
                          <input
                            type="text"
                            value={confirmQuantity}
                            onChange={(e) => setConfirmQuantity(e.target.value)}
                            className={styles.confirmInput}
                            disabled={pendingConfirmation !== message.id}
                          />
                        </div>

                        {pendingConfirmation === message.id && (
                          <div className={styles.confirmationButtons}>
                            <button onClick={handleConfirmFood} className={styles.confirmButton} disabled={isLoading}>
                              <Check size={16} />
                              Confirmar
                            </button>
                            <button onClick={handleCancelConfirmation} className={styles.cancelButton}>
                              <X size={16} />
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>{message.content}</p>
                    {message.nutritionData && (
                      <div className={styles.nutritionCard}>
                        <div className={styles.caloriesSection}>
                          <h3>🔥 {message.nutritionData.macros.calories} kcal</h3>
                        </div>

                        <div className={styles.macrosSection}>
                          <h4>Macronutrientes:</h4>

                          <div className={styles.macroItem}>
                            <span className={styles.macroLabel}>🥩 Proteínas</span>
                            <div className={styles.macroBar}>
                              <div
                                className={styles.macroFill}
                                style={{
                                  width: `${(message.nutritionData.macros.protein / 50) * 100}%`,
                                  backgroundColor: "#ff6b6b",
                                }}
                              ></div>
                            </div>
                            <span className={styles.macroValue}>{message.nutritionData.macros.protein}g</span>
                          </div>

                          <div className={styles.macroItem}>
                            <span className={styles.macroLabel}>🍞 Carbohidratos</span>
                            <div className={styles.macroBar}>
                              <div
                                className={styles.macroFill}
                                style={{
                                  width: `${(message.nutritionData.macros.carbs / 80) * 100}%`,
                                  backgroundColor: "#4ecdc4",
                                }}
                              ></div>
                            </div>
                            <span className={styles.macroValue}>{message.nutritionData.macros.carbs}g</span>
                          </div>

                          <div className={styles.macroItem}>
                            <span className={styles.macroLabel}>🥑 Grasas</span>
                            <div className={styles.macroBar}>
                              <div
                                className={styles.macroFill}
                                style={{
                                  width: `${(message.nutritionData.macros.fat / 40) * 100}%`,
                                  backgroundColor: "#45b7d1",
                                }}
                              ></div>
                            </div>
                            <span className={styles.macroValue}>{message.nutritionData.macros.fat}g</span>
                          </div>
                        </div>

                        <div className={styles.adviceSection}>
                          <h4>💡 Consejo:</h4>
                          <p>{message.nutritionData.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <span className={styles.timestamp}>
                  {message.timestamp.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.system} ${styles.fadeIn}`}>
              <div className={styles.message}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          {isRecording && (
            <div className={styles.recordingIndicator}>
              <div className={styles.recordingPulse}></div>
              <span>Escuchando... Hablá ahora</span>
            </div>
          )}

          {isProcessingVoice && (
            <div className={styles.processingIndicator}>
              <span>Preparando micrófono...</span>
            </div>
          )}

          <div className={styles.inputWrapper}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? "Escuchando..." : "¿Qué comiste hoy?"}
              className={styles.input}
              disabled={isLoading || isRecording || !!pendingConfirmation}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.imageButton}
              disabled={isLoading || !!pendingConfirmation}
              title="Subir foto de comida"
            >
              <Camera size={20} />
            </button>
            <button
              onClick={handleMicClick}
              className={getMicButtonClass()}
              disabled={isLoading || !!pendingConfirmation}
              title={isRecording ? "Detener grabación" : "Grabar mensaje de voz"}
            >
              <MicIcon size={20} />
            </button>
            <button
              onClick={handleSend}
              className={styles.sendButton}
              disabled={isLoading || !inputValue.trim() || isRecording || !!pendingConfirmation}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
