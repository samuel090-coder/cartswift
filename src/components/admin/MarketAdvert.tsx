import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Wand2, 
  Loader2, 
  Copy, 
  Check, 
  Send, 
  Sparkles,
  FileText,
  Users,
  ExternalLink
} from 'lucide-react';

// Marketing email templates
const emailTemplates = [
  {
    id: 'welcome',
    name: 'Welcome & Introduction',
    subject: 'Discover Premium Products at Unbeatable Prices',
    body: `Hello,

I hope this message finds you well! I wanted to personally reach out and introduce you to CARTSWIFT - your new destination for premium products at prices you'll love.

🎁 What We Offer:
• Curated selection of high-quality products
• Secure payment options (Crypto, PayPal, Bank Transfer)
• Fast digital delivery for digital products
• Exclusive deals you won't find elsewhere

🔥 Special Launch Offer:
As a new visitor, you're eligible for an exclusive welcome discount on your first purchase!

Ready to explore? Visit us at: [YOUR_SITE_URL]

Looking forward to serving you!

Best regards,
The CARTSWIFT Team`
  },
  {
    id: 'sale',
    name: 'Flash Sale Announcement',
    subject: '⚡ FLASH SALE: Up to 70% OFF - Limited Time!',
    body: `Hi there!

🚨 FLASH SALE ALERT! 🚨

For a limited time only, we're offering incredible discounts on our most popular items!

💰 What's on sale:
• Premium digital products - Up to 70% OFF
• Exclusive bundles - Buy 2 Get 1 FREE
• New arrivals with launch discounts

⏰ Hurry! This sale ends soon!

👉 Shop now: [YOUR_SITE_URL]

Don't miss out on these amazing deals!

Cheers,
CARTSWIFT Team

P.S. The best deals go fast - secure yours before they're gone!`
  },
  {
    id: 'newProduct',
    name: 'New Product Launch',
    subject: '🆕 Just Dropped: Something Special Just For You',
    body: `Hello!

Exciting news! We've just added something amazing to our collection, and we thought you'd want to be among the first to know.

✨ NEW ARRIVAL ✨

We've sourced exclusive products that our customers have been asking for. Quality guaranteed, prices you'll love.

🎯 Why shop with us:
• Verified quality products
• Secure checkout
• Multiple payment options
• Instant delivery for digital items

Be among the first to check it out: [YOUR_SITE_URL]

Questions? Just reply to this email!

Best,
CARTSWIFT Team`
  },
  {
    id: 'reminder',
    name: 'Friendly Reminder',
    subject: 'Still thinking about it? Here\'s a nudge...',
    body: `Hey there!

We noticed you were browsing our store recently but didn't complete your purchase. No worries - we all get busy!

Just wanted to remind you that our products are waiting for you. And here's a little incentive to come back:

🎁 Use code COMEBACK10 for 10% off your order!

Our bestsellers are going fast, and we'd hate for you to miss out.

👉 Continue shopping: [YOUR_SITE_URL]

Still have questions? We're here to help!

Warm regards,
CARTSWIFT Team`
  }
];

export const MarketAdvert = () => {
  const [emailCount, setEmailCount] = useState(100);
  const [generatedEmails, setGeneratedEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate random Gmail addresses using AI
  const generateEmailsMutation = useMutation({
    mutationFn: async (count: number) => {
      const { data, error } = await supabase.functions.invoke('ai-notification-assistant', {
        body: { 
          action: 'generateEmails',
          count: Math.min(count, 500) // Limit to 500
        },
      });
      if (error) throw error;
      return data.emails as string[];
    },
    onSuccess: (emails) => {
      setGeneratedEmails(emails);
      setSelectedEmails([]);
      toast({ title: 'Emails Generated', description: `${emails.length} email addresses generated!` });
    },
    onError: (error: any) => {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSelectAll = () => {
    if (selectedEmails.length === generatedEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...generatedEmails]);
    }
  };

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const getEmailContent = () => {
    const subject = customSubject || selectedTemplate.subject;
    let body = customBody || selectedTemplate.body;
    body = body.replace(/\[YOUR_SITE_URL\]/g, siteUrl || 'https://yoursite.com');
    return { subject, body };
  };

  const handleCopyEmails = () => {
    const emailList = selectedEmails.join(', ');
    navigator.clipboard.writeText(emailList);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: `${selectedEmails.length} emails copied to clipboard` });
  };

  const handleOpenGmail = () => {
    if (selectedEmails.length === 0) {
      toast({ title: 'No emails selected', description: 'Please select emails first', variant: 'destructive' });
      return;
    }

    const { subject, body } = getEmailContent();
    const bcc = selectedEmails.join(',');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bcc)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Market Advert
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate email addresses and send marketing campaigns
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="gap-2">
            <Wand2 className="h-4 w-4" /> Generate
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" /> Send
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Email Generator
              </CardTitle>
              <CardDescription>
                Generate random Gmail addresses for your marketing campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Number of Emails (max 500)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={500}
                    value={emailCount}
                    onChange={(e) => setEmailCount(Math.min(500, Math.max(10, parseInt(e.target.value) || 100)))}
                  />
                </div>
                <Button
                  onClick={() => generateEmailsMutation.mutate(emailCount)}
                  disabled={generateEmailsMutation.isPending}
                  className="gap-2"
                >
                  {generateEmailsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Generate Emails
                </Button>
              </div>

              {generatedEmails.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEmails.length === generatedEmails.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label>Select All ({generatedEmails.length})</Label>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {selectedEmails.length} selected
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyEmails}
                        disabled={selectedEmails.length === 0}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {generatedEmails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleEmail(email)}
                        >
                          <Checkbox
                            checked={selectedEmails.includes(email)}
                            onCheckedChange={() => handleToggleEmail(email)}
                          />
                          <span className="text-sm font-mono truncate">{email}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Choose a professional template or customize your message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {emailTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate.id === template.id ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCustomSubject('');
                      setCustomBody('');
                    }}
                  >
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>

              <div>
                <Label>Your Site URL</Label>
                <Input
                  placeholder="https://yoursite.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                />
              </div>

              <div>
                <Label>Subject Line</Label>
                <Input
                  placeholder={selectedTemplate.subject}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              </div>

              <div>
                <Label>Email Body</Label>
                <Textarea
                  rows={12}
                  placeholder="Customize your email..."
                  value={customBody || selectedTemplate.body}
                  onChange={(e) => setCustomBody(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Campaign
              </CardTitle>
              <CardDescription>
                Review and send your marketing email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Selected Recipients</p>
                  <p className="text-2xl font-bold">{selectedEmails.length}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="text-lg font-semibold">{selectedTemplate.name}</p>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <h4 className="font-semibold">Preview:</h4>
                <p className="text-sm"><strong>Subject:</strong> {getEmailContent().subject}</p>
                <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-[200px] overflow-y-auto">
                  {getEmailContent().body}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleOpenGmail}
                disabled={selectedEmails.length === 0}
              >
                <ExternalLink className="h-5 w-5" />
                Open Gmail & Send ({selectedEmails.length} recipients)
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This will open Gmail in a new tab with your campaign pre-filled. 
                You'll need to review and click Send in Gmail.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};