import { useState, useEffect, useRef } from "react";

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Open' | 'Closing' | 'Closed'>('Closed');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setConnectionStatus('Open');
          setSocket(ws);
          reconnectAttempts.current = 0;
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          setLastMessage(event.data);
        };

        ws.onclose = () => {
          setConnectionStatus('Closed');
          setSocket(null);
          console.log('WebSocket disconnected');
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const timeout = Math.pow(2, reconnectAttempts.current) * 1000;
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              connect();
            }, timeout);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        setConnectionStatus('Connecting');
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('Closed');
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url]);

  const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  };

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}
