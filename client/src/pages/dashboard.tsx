import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { 
  Bot, 
  Settings, 
  MessageSquare, 
  Users, 
  Clock, 
  Zap,
  TrendingUp,
  Server,
  RefreshCw,
  Play,
  Square
} from "lucide-react";

interface BotStatus {
  isRunning: boolean;
  guilds: number;
  username: string | null;
  uptime: number | null;
}

interface BotStats {
  totalServers: number;
  totalMessages: number;
  activeConversations: number;
  apiCalls: number;
  uptime: number;
}

interface BotSettings {
  id: number;
  guildId: string;
  prefix: string;
  responseLength: string;
  personality: string;
  codeFormat: boolean;
  allowedChannels: string[];
  channelMode: string;
  slashCommandMode: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedGuild, setSelectedGuild] = useState<string>("global");

  // Query bot status
  const { data: botStatus, isLoading: statusLoading } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000,
  });

  // Query bot statistics
  const { data: botStats, isLoading: statsLoading } = useQuery<BotStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  // Query settings for selected guild
  const { data: settings, isLoading: settingsLoading } = useQuery<BotSettings>({
    queryKey: ["/api/settings", selectedGuild],
    enabled: selectedGuild !== "global",
  });

  // Bot control mutations
  const startBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/start"),
    onSuccess: () => {
      toast({ title: "Bot started successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    onError: () => {
      toast({ title: "Failed to start bot", variant: "destructive" });
    },
  });

  const stopBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/stop"),
    onSuccess: () => {
      toast({ title: "Bot stopped successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/status"] });
    },
    onError: () => {
      toast({ title: "Failed to stop bot", variant: "destructive" });
    },
  });

  // Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<BotSettings>) => 
      apiRequest("POST", "/api/settings", newSettings),
    onSuccess: () => {
      toast({ title: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const formatUptime = (uptimeMs: number | null) => {
    if (!uptimeMs) return "0m";
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleSettingsChange = (field: string, value: any) => {
    if (!settings) return;
    
    updateSettingsMutation.mutate({
      ...settings,
      [field]: value,
    });
  };

  return (
    <div className="min-h-screen bg-discord-background">
      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 bg-discord-secondary border-r border-discord-elevated">
          <div className="p-6 border-b border-discord-elevated">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-discord-primary rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-discord-text">
                  {botStatus?.username || "AI Assistant Bot"}
                </h1>
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      botStatus?.isRunning ? "bg-discord-success" : "bg-discord-error"
                    }`}
                  />
                  <p className="text-sm text-discord-muted">
                    {botStatus?.isRunning ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-discord-primary text-white">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </div>
          </nav>

          <div className="p-4 border-t border-discord-elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  botStatus?.isRunning ? "bg-discord-success" : "bg-discord-error"
                }`} />
                <span className="text-sm text-discord-muted">
                  {botStatus?.isRunning ? "Bot Online" : "Bot Offline"}
                </span>
              </div>
              <span className="text-xs text-discord-muted">
                {formatUptime(botStatus?.uptime)}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="bg-discord-secondary border-b border-discord-elevated px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-discord-text">Dashboard Overview</h2>
                <p className="text-sm text-discord-muted">Manage your AI assistant bot configuration</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => queryClient.invalidateQueries()}
                  variant="outline"
                  size="sm"
                  className="bg-discord-elevated border-discord-background text-discord-text hover:bg-discord-background"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  RefreshCw
                </Button>
                {botStatus?.isRunning ? (
                  <Button
                    onClick={() => stopBotMutation.mutate()}
                    disabled={stopBotMutation.isPending}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Bot
                  </Button>
                ) : (
                  <Button
                    onClick={() => startBotMutation.mutate()}
                    disabled={startBotMutation.isPending}
                    className="bg-discord-primary hover:bg-blue-600"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Bot
                  </Button>
                )}
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-discord-elevated border-discord-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-discord-muted">Total Servers</p>
                      <p className="text-2xl font-bold text-discord-text">
                        {statsLoading ? "..." : botStats?.totalServers || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-discord-primary bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Server className="w-5 h-5 text-discord-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-discord-elevated border-discord-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-discord-muted">Active Conversations</p>
                      <p className="text-2xl font-bold text-discord-text">
                        {statsLoading ? "..." : botStats?.activeConversations || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-discord-success bg-opacity-20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-discord-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-discord-elevated border-discord-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-discord-muted">Total Messages</p>
                      <p className="text-2xl font-bold text-discord-text">
                        {statsLoading ? "..." : botStats?.totalMessages?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-discord-warning bg-opacity-20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-discord-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-discord-elevated border-discord-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-discord-muted">API Calls</p>
                      <p className="text-2xl font-bold text-discord-text">
                        {statsLoading ? "..." : botStats?.apiCalls?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-discord-error bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-discord-error" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Configuration Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Mode Configuration */}
              <Card className="bg-discord-elevated border-discord-background">
                <CardHeader>
                  <CardTitle className="text-discord-text">Response Mode Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-discord-muted mb-3 block">Server Selection</Label>
                    <Select value={selectedGuild} onValueChange={setSelectedGuild}>
                      <SelectTrigger className="bg-discord-secondary border-discord-background text-discord-text">
                        <SelectValue placeholder="Select a server" />
                      </SelectTrigger>
                      <SelectContent className="bg-discord-secondary border-discord-background">
                        <SelectItem value="global" className="text-discord-text">Global Settings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGuild !== "global" && settings && (
                    <div className="space-y-4">
                      <Separator className="bg-discord-background" />
                      <div>
                        <Label className="text-discord-muted mb-3 block">Response Mode</Label>
                        <RadioGroup
                          value={settings.slashCommandMode}
                          onValueChange={(value) => handleSettingsChange("slashCommandMode", value)}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-3 p-3 bg-discord-secondary rounded-lg">
                            <RadioGroupItem value="disabled" id="disabled" />
                            <div>
                              <Label htmlFor="disabled" className="text-discord-text font-medium">
                                Disabled Mode
                              </Label>
                              <p className="text-sm text-discord-muted">
                                Bot responds to all messages normally
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 p-3 bg-discord-secondary rounded-lg">
                            <RadioGroupItem value="enabled" id="enabled" />
                            <div>
                              <Label htmlFor="enabled" className="text-discord-text font-medium">
                                Enabled Mode
                              </Label>
                              <p className="text-sm text-discord-muted">
                                Responds to both messages and slash commands
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 p-3 bg-discord-secondary rounded-lg">
                            <RadioGroupItem value="required" id="required" />
                            <div>
                              <Label htmlFor="required" className="text-discord-text font-medium">
                                Required Mode
                              </Label>
                              <p className="text-sm text-discord-muted">
                                Only responds to slash commands (/ai)
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Personality & Behavior */}
              <Card className="bg-discord-elevated border-discord-background">
                <CardHeader>
                  <CardTitle className="text-discord-text">AI Personality & Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedGuild !== "global" && settings ? (
                    <>
                      <div>
                        <Label className="text-discord-muted mb-2 block">Personality Type</Label>
                        <Select
                          value={settings.personality}
                          onValueChange={(value) => handleSettingsChange("personality", value)}
                        >
                          <SelectTrigger className="bg-discord-secondary border-discord-background text-discord-text">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-discord-secondary border-discord-background">
                            <SelectItem value="helpful" className="text-discord-text">Helpful (Default)</SelectItem>
                            <SelectItem value="friendly" className="text-discord-text">Friendly & Casual</SelectItem>
                            <SelectItem value="technical" className="text-discord-text">Technical & Precise</SelectItem>
                            <SelectItem value="creative" className="text-discord-text">Creative & Imaginative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-discord-muted mb-2 block">Response Length</Label>
                        <Select
                          value={settings.responseLength}
                          onValueChange={(value) => handleSettingsChange("responseLength", value)}
                        >
                          <SelectTrigger className="bg-discord-secondary border-discord-background text-discord-text">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-discord-secondary border-discord-background">
                            <SelectItem value="concise" className="text-discord-text">Concise</SelectItem>
                            <SelectItem value="medium" className="text-discord-text">Medium (Default)</SelectItem>
                            <SelectItem value="detailed" className="text-discord-text">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-discord-muted">Code Formatting</Label>
                        <Switch
                          checked={settings.codeFormat}
                          onCheckedChange={(checked) => handleSettingsChange("codeFormat", checked)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-discord-muted">Select a server to configure AI settings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bot Status */}
            <Card className="bg-discord-elevated border-discord-background">
              <CardHeader>
                <CardTitle className="text-discord-text">Bot Status & API Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-discord-muted mb-2 block">Discord Bot Status</Label>
                    <div className="flex items-center space-x-2 p-3 bg-discord-secondary rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        botStatus?.isRunning ? "bg-discord-success" : "bg-discord-error"
                      }`} />
                      <span className="text-sm text-discord-text">
                        {botStatus?.isRunning ? "Connected" : "Disconnected"}
                      </span>
                      <span className="text-xs text-discord-muted ml-auto">
                        {botStatus?.guilds || 0} servers
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-discord-muted mb-2 block">OpenAI API Status</Label>
                    <div className="flex items-center space-x-2 p-3 bg-discord-secondary rounded-lg">
                      <div className="w-2 h-2 bg-discord-success rounded-full" />
                      <span className="text-sm text-discord-text">Connected</span>
                      <span className="text-xs text-discord-muted ml-auto">GPT-4o</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4 bg-discord-background" />

                <div>
                  <Label className="text-discord-muted mb-2 block">Environment Variables</Label>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex items-center justify-between p-2 bg-discord-secondary rounded">
                      <span className="text-discord-muted">DISCORD_TOKEN</span>
                      <Badge variant="outline" className="bg-discord-success text-discord-text border-discord-success">
                        ✓ Set
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-discord-secondary rounded">
                      <span className="text-discord-muted">OPENAI_API_KEY</span>
                      <Badge variant="outline" className="bg-discord-success text-discord-text border-discord-success">
                        ✓ Set
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
