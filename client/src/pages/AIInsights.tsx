import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain, RefreshCw, AlertTriangle, CheckCircle2, Info, XCircle,
  TrendingUp, Target, Zap, ArrowRight, Plus, Trash2, Star,
  Shield, ChevronDown, ChevronUp, Loader2
} from "lucide-react";

interface HealthCheck {
  area: string;
  status: "good" | "warning" | "critical" | "missing" | "info";
  message: string;
}

interface AIInsight {
  category: string;
  priority: string;
  title: string;
  description: string;
  actionItems: string[];
  competitorContext: string | null;
  estimatedImpact: string;
}

interface InsightsData {
  configured: boolean;
  overallScore?: number;
  insights?: AIInsight[];
  competitorComparison?: {
    strongerAreas: string[];
    weakerAreas: string[];
    opportunities: string[];
  };
  weeklyPriorities?: string[];
  generatedAt?: string;
  error?: string;
}

interface Competitor {
  id: number;
  name: string;
  website: string | null;
  googleMapsUrl: string | null;
  gmbRating: number | null;
  gmbReviewCount: number | null;
  gmbCategories: string | null;
}

export default function AIInsights() {
  const queryClient = useQueryClient();
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", website: "", gmbRating: "", gmbReviewCount: "" });

  // Health check (quick, no AI)
  const { data: health, isLoading: healthLoading } = useQuery<{ checks: HealthCheck[] }>({
    queryKey: ["/api/ai/health-check"],
  });

  // AI insights (uses Claude)
  const { data: insights, isLoading: insightsLoading, isFetching } = useQuery<InsightsData>({
    queryKey: ["/api/ai/insights"],
  });

  // Competitors
  const { data: competitorsList } = useQuery<Competitor[]>({
    queryKey: ["/api/competitors"],
  });

  // Refresh AI insights
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/insights?refresh=true");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/health-check"] });
    },
  });

  // Add competitor
  const addCompetitorMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
      setShowAddCompetitor(false);
      setNewCompetitor({ name: "", website: "", gmbRating: "", gmbReviewCount: "" });
    },
  });

  // Delete competitor
  const deleteCompetitorMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitors"] });
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "good": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "critical": return <XCircle className="w-4 h-4 text-red-400" />;
      case "info": return <Info className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-red-500/30 bg-red-500/5";
      case "medium": return "border-amber-500/30 bg-amber-500/5";
      case "low": return "border-blue-500/30 bg-blue-500/5";
      default: return "border-[#2d3344] bg-[#1d2332]";
    }
  };

  const categoryIcon = (category: string) => {
    switch (category) {
      case "seo": return <Target className="w-4 h-4 text-blue-400" />;
      case "ads": return <Zap className="w-4 h-4 text-amber-400" />;
      case "gmb": return <Star className="w-4 h-4 text-yellow-400" />;
      case "website": return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "content": return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default: return <Brain className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Insights</h1>
            <p className="text-slate-400 text-sm">AI-powered recommendations to outrank your competition</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || isFetching}
          className="bg-[#1d2332] border-[#2d3344] text-white hover:bg-[#2d3344]"
        >
          {(refreshMutation.isPending || isFetching) ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh Analysis
        </Button>
      </div>

      {/* Overall Score */}
      {insights?.overallScore && (
        <Card className="border-[#2d3344] bg-[#1d2332]">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#2d3344" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={insights.overallScore >= 70 ? "#10b981" : insights.overallScore >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${insights.overallScore}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{insights.overallScore}</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Digital Presence Score</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Based on your website, search rankings, ads performance, and Google Business Profile
                </p>
                {insights.generatedAt && (
                  <p className="text-xs text-slate-500 mt-2">
                    Last analyzed: {new Date(insights.generatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Check */}
      <Card className="border-[#2d3344] bg-[#1d2332]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Quick Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-700/30 rounded animate-pulse" />
              ))}
            </div>
          ) : health?.checks ? (
            <div className="space-y-2">
              {health.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2d3344] last:border-0">
                  {statusIcon(check.status)}
                  <span className="text-sm text-slate-300 font-medium w-32">{check.area}</span>
                  <span className="text-sm text-slate-400 flex-1">{check.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Unable to run health check</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly Priorities */}
      {insights?.weeklyPriorities && insights.weeklyPriorities.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-orange-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" /> This Week's Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.weeklyPriorities.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-orange-400 font-bold text-sm shrink-0">{i + 1}.</span>
                  <span className="text-sm text-white">{p}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {insightsLoading ? (
        <Card className="border-[#2d3344] bg-[#1d2332]">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
            <p className="text-slate-400">Analyzing your data with AI...</p>
            <p className="text-xs text-slate-500 mt-1">This may take 15-30 seconds</p>
          </CardContent>
        </Card>
      ) : insights?.insights && insights.insights.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          {insights.insights.map((insight, i) => (
            <Card key={i} className={`${priorityColor(insight.priority)} transition-all cursor-pointer`}
              onClick={() => setExpandedInsight(expandedInsight === i ? null : i)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {categoryIcon(insight.category)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        insight.priority === "high" ? "bg-red-500/20 text-red-400" :
                        insight.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {insight.priority}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">{insight.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mt-1">{insight.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{insight.description}</p>

                    {expandedInsight === i && (
                      <div className="mt-3 space-y-3">
                        {insight.actionItems && insight.actionItems.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Action Items:</p>
                            {insight.actionItems.map((item, j) => (
                              <div key={j} className="flex items-start gap-2 py-1">
                                <ArrowRight className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-300">{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {insight.competitorContext && (
                          <p className="text-xs text-slate-500">
                            <span className="text-slate-400">Competitor context:</span> {insight.competitorContext}
                          </p>
                        )}
                        {insight.estimatedImpact && (
                          <p className="text-xs text-emerald-400">
                            Expected impact: {insight.estimatedImpact}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {expandedInsight === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights?.error ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 text-sm">{insights.error}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Competitor Comparison */}
      {insights?.competitorComparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Where You Lead</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.competitorComparison.strongerAreas.map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">{a}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-red-400 uppercase tracking-wider">Where They Lead</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.competitorComparison.weakerAreas.map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-sm text-slate-300">{a}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.competitorComparison.opportunities.map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-sm text-slate-300">{a}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competitors List */}
      <Card className="border-[#2d3344] bg-[#1d2332]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" /> Tracked Competitors
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCompetitor(!showAddCompetitor)}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddCompetitor && (
            <div className="p-3 rounded-lg bg-[#161b28] border border-[#2d3344] mb-3 space-y-2">
              <input
                type="text"
                placeholder="Business name"
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#1d2332] border border-[#2d3344] rounded text-white placeholder-slate-500"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Website URL"
                  value={newCompetitor.website}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, website: e.target.value })}
                  className="px-3 py-2 text-sm bg-[#1d2332] border border-[#2d3344] rounded text-white placeholder-slate-500"
                />
                <input
                  type="text"
                  placeholder="GMB Rating (e.g. 4.8)"
                  value={newCompetitor.gmbRating}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, gmbRating: e.target.value })}
                  className="px-3 py-2 text-sm bg-[#1d2332] border border-[#2d3344] rounded text-white placeholder-slate-500"
                />
                <input
                  type="text"
                  placeholder="Review count"
                  value={newCompetitor.gmbReviewCount}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, gmbReviewCount: e.target.value })}
                  className="px-3 py-2 text-sm bg-[#1d2332] border border-[#2d3344] rounded text-white placeholder-slate-500"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addCompetitorMutation.mutate({
                    name: newCompetitor.name,
                    website: newCompetitor.website || null,
                    gmbRating: newCompetitor.gmbRating ? parseFloat(newCompetitor.gmbRating) : null,
                    gmbReviewCount: newCompetitor.gmbReviewCount ? parseInt(newCompetitor.gmbReviewCount) : null,
                  })}
                  disabled={!newCompetitor.name || addCompetitorMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddCompetitor(false)}
                  className="text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {competitorsList && competitorsList.length > 0 ? (
            <div className="space-y-2">
              {competitorsList.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#2d3344] last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-sm text-white font-medium">{c.name}</span>
                      {c.website && (
                        <span className="text-xs text-slate-500 ml-2">{c.website}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {c.gmbRating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-slate-300">{c.gmbRating}</span>
                        {c.gmbReviewCount && (
                          <span className="text-xs text-slate-500">({c.gmbReviewCount})</span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => deleteCompetitorMutation.mutate(c.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-4 text-center">
              No competitors tracked yet. Add your local competitors so AI can benchmark your performance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
