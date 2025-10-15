import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X } from 'lucide-react';
import { VoiceAssistant as VoiceAssistantClass, VoiceMessage } from '@/utils/VoiceAssistant';
import { toast } from 'sonner';

const VoiceAssistantComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const assistantRef = useRef<VoiceAssistantClass | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const projectRef = 'qcfsnqumydfminvmqyfp';

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFunctionCall = (functionName: string, args: any) => {
    console.log('Function called:', functionName, args);
    
    // Add system message about the action
    const actionMessage: VoiceMessage = {
      role: 'assistant',
      content: `🔧 Executing: ${functionName}`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, actionMessage]);

    // Here you would actually execute the function
    // For now, we'll just show what would happen
    switch (functionName) {
      case 'search_products':
        toast.info(`Searching for: ${args.query || 'all products'}`);
        // In Phase 2, we'll actually search and display results
        break;
      case 'add_to_cart':
        toast.success(`Added item ${args.item_id} to cart`);
        // In Phase 2, we'll actually add to cart
        break;
      case 'track_order':
        toast.info(`Tracking order: ${args.order_id}`);
        // In Phase 2, we'll actually track the order
        break;
      case 'checkout':
        toast.info('Proceeding to checkout...');
        // In Phase 2, we'll actually navigate to checkout
        break;
    }
  };

  const connect = async () => {
    try {
      const assistant = new VoiceAssistantClass(
        projectRef,
        (message) => {
          setMessages(prev => [...prev, message]);
        },
        handleFunctionCall
      );
      
      await assistant.connect();
      assistantRef.current = assistant;
      setIsConnected(true);
      
      toast.success('Voice assistant connected');
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to connect to voice assistant');
    }
  };

  const disconnect = () => {
    if (assistantRef.current) {
      assistantRef.current.disconnect();
      assistantRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setMessages([]);
  };

  const toggleRecording = async () => {
    if (!assistantRef.current) return;

    try {
      if (isRecording) {
        assistantRef.current.stopRecording();
        setIsRecording(false);
      } else {
        await assistantRef.current.startRecording();
        setIsRecording(true);
        toast.success('Listening... speak now');
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Microphone access denied');
    }
  };

  useEffect(() => {
    console.log('VoiceAssistant component mounted');
    return () => {
      console.log('VoiceAssistant component unmounted');
      if (assistantRef.current) {
        assistantRef.current.disconnect();
      }
    };
  }, []);

  console.log('VoiceAssistant render - isOpen:', isOpen, 'isConnected:', isConnected);

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          console.log('Microphone button clicked');
          setIsOpen(true);
          if (!isConnected) connect();
        }}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        size="icon"
      >
        <Mic className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          <span className="font-semibold">Voice Assistant</span>
          {isConnected && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false);
            disconnect();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            <p className="mb-2">👋 Hi! I'm your CartSwift assistant.</p>
            <p className="text-xs">Try saying:</p>
            <ul className="text-xs mt-2 space-y-1">
              <li>"Search for sneakers under ₦20,000"</li>
              <li>"Show me the cheapest laptop"</li>
              <li>"Add to cart"</li>
              <li>"Track my order"</li>
            </ul>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-center gap-4">
          {!isConnected ? (
            <Button onClick={connect} className="flex-1">
              Connect
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleRecording}
                variant={isRecording ? 'destructive' : 'default'}
                className="flex-1"
                size="lg"
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-5 w-5" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Start Listening
                  </>
                )}
              </Button>
            </>
          )}
        </div>
        {isRecording && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            🎤 Listening...
          </p>
        )}
      </div>
    </Card>
  );
};

export default VoiceAssistantComponent;
