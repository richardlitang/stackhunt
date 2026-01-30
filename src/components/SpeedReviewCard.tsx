/**
 * Speed Review Card Component
 *
 * "Management by Exception" interface for rapid review:
 * - Traffic Light highlighting (Red=low, Yellow=medium, Green=high confidence)
 * - Source Peeking (clickable [Source] links)
 * - Inline Editing (click-to-edit)
 */

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KnowledgeCard {
  official_name: string;
  tagline?: string | null;
  website_url?: string | null;
  pricing: {
    model: string;
    has_free_tier: boolean;
    has_free_trial: boolean;
    trial_days?: number | null;
    starting_price?: string | null;
    tiers?: Array<{
      name: string;
      price?: string | null;
      features?: string[];
    }>;
  };
  platforms?: Array<{
    platform: string;
    available: boolean;
  }>;
  features?: {
    core?: string[];
    unique?: string[];
  };
  integrations?: {
    has_api?: boolean;
    has_zapier?: boolean;
    has_webhooks?: boolean;
    total_count?: number | null;
  };
  security?: {
    sso_available?: boolean | null;
    two_factor?: boolean | null;
    soc2_certified?: boolean | null;
    self_hosted_option?: boolean;
  };
  audience?: {
    primary?: string[];
    team_size?: string | null;
  };
  competitive?: {
    best_for?: string | null;
    differentiators?: string[];
  };
  meta: {
    data_quality: 'high' | 'medium' | 'low';
    extraction_date?: string;
  };
}

interface Source {
  url: string;
  title?: string;
  type?: string;
}

interface Review {
  id: string;
  score: number;
  summary_markdown?: string;
  pros?: string[];
  cons?: string[];
  sources?: Source[];
  tool: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    knowledge_card?: KnowledgeCard;
  };
  context?: {
    id: string;
    title: string;
    slug: string;
  };
}

interface SpeedReviewCardProps {
  review: Review;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onUpdate: (id: string, field: string, value: unknown) => void;
  isLoading?: boolean;
}

// Confidence color mapping
const confidenceColors = {
  high: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Verified',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Inferred',
  },
  low: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Needs Review',
  },
};

// Inline editable field component
function EditableField({
  value,
  onSave,
  type = 'text',
  className = '',
}: {
  value: string | number | null | undefined;
  onSave: (value: string) => void;
  type?: 'text' | 'number' | 'textarea';
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== String(value || '')) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(String(value || ''));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return type === 'textarea' ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
        rows={3}
      />
    ) : (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer rounded px-1 -mx-1 hover:bg-slate-100 ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-slate-400 italic">Click to add</span>}
    </span>
  );
}

// Source link component
function SourceLink({ sources, fieldName }: { sources?: Source[]; fieldName: string }) {
  // Find a relevant source for this field
  const source = sources?.find(
    (s) =>
      s.type?.toLowerCase().includes(fieldName.toLowerCase()) ||
      s.title?.toLowerCase().includes(fieldName.toLowerCase())
  ) || sources?.[0];

  if (!source) return null;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1 text-xs text-hunt-500 hover:text-hunt-600 hover:underline"
      title={source.title || source.url}
    >
      [Source]
    </a>
  );
}

// Fact row component with traffic light
function FactRow({
  label,
  value,
  confidence,
  sources,
  onEdit,
  collapsed = false,
}: {
  label: string;
  value: React.ReactNode;
  confidence: 'high' | 'medium' | 'low';
  sources?: Source[];
  onEdit?: (value: string) => void;
  collapsed?: boolean;
}) {
  const colors = confidenceColors[confidence];

  // High confidence facts can be collapsed by default
  if (collapsed && confidence === 'high') {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${colors.bg} ${colors.border}`}
    >
      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} title={colors.label} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase">{label}</span>
          <SourceLink sources={sources} fieldName={label} />
        </div>
        <div className={`mt-0.5 text-sm ${colors.text}`}>
          {onEdit ? (
            <EditableField value={String(value)} onSave={onEdit} />
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpeedReviewCard({
  review,
  onPublish,
  onReject,
  onUpdate,
  isLoading,
}: SpeedReviewCardProps) {
  const [showAllFacts, setShowAllFacts] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [scoreValue, setScoreValue] = useState(review.score);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  const tool = review.tool;
  const card = tool.knowledge_card;
  const dataQuality = card?.meta?.data_quality || 'low';
  const colors = confidenceColors[dataQuality];

  // Count facts by confidence
  const factCounts = { high: 0, medium: 0, low: 0 };
  if (card) {
    // Simple heuristic: count filled fields
    if (card.pricing?.starting_price) factCounts.high++;
    if (card.pricing?.model) factCounts.high++;
    if (card.platforms?.length) factCounts.medium++;
    if (card.features?.core?.length) factCounts.medium++;
    if (!card.pricing?.starting_price) factCounts.low++;
  }

  const handleScoreSave = () => {
    setEditingScore(false);
    if (scoreValue !== review.score) {
      onUpdate(review.id, 'score', scoreValue);
    }
  };

  useEffect(() => {
    if (editingScore && scoreInputRef.current) {
      scoreInputRef.current.focus();
      scoreInputRef.current.select();
    }
  }, [editingScore]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Confidence Banner */}
      <div className={`px-4 py-2 ${colors.bg} ${colors.border} border-b flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
          <span className={`text-sm font-medium ${colors.text}`}>
            Data Quality: {dataQuality.charAt(0).toUpperCase() + dataQuality.slice(1)}
          </span>
        </div>
        <button
          onClick={() => setShowAllFacts(!showAllFacts)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {showAllFacts ? 'Hide verified' : 'Show all facts'}
        </button>
      </div>

      {/* Tool Header */}
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {tool.logo_url ? (
              <img src={tool.logo_url} alt="" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-2xl font-bold text-slate-300">
                {tool.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{tool.name}</h2>
              {/* Editable Score */}
              {editingScore ? (
                <Input
                  ref={scoreInputRef}
                  type="number"
                  min={0}
                  max={100}
                  value={scoreValue}
                  onChange={(e) => setScoreValue(Number(e.target.value))}
                  onBlur={handleScoreSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleScoreSave();
                    if (e.key === 'Escape') {
                      setScoreValue(review.score);
                      setEditingScore(false);
                    }
                  }}
                  className="w-20 text-center font-semibold"
                />
              ) : (
                <button
                  onClick={() => setEditingScore(true)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition hover:ring-2 hover:ring-offset-1 ${
                    review.score >= 70
                      ? 'bg-green-100 text-green-700 hover:ring-green-300'
                      : review.score >= 50
                        ? 'bg-amber-100 text-amber-700 hover:ring-amber-300'
                        : 'bg-red-100 text-red-700 hover:ring-red-300'
                  }`}
                  title="Click to edit score"
                >
                  {review.score}/100
                </button>
              )}
            </div>
            {review.context && (
              <p className="mt-1 text-slate-500">{review.context.title}</p>
            )}
            {card?.tagline && (
              <p className="mt-2 text-sm text-slate-600 italic">"{card.tagline}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Knowledge Card Facts - Traffic Light View */}
      {card && (
        <div className="p-6 space-y-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Knowledge Card
            <span className="text-xs font-normal text-slate-400">
              ({factCounts.low} needs review, {factCounts.medium} inferred, {factCounts.high} verified)
            </span>
          </h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Pricing - Often needs review */}
            <FactRow
              label="Pricing Model"
              value={card.pricing?.model || 'Unknown'}
              confidence={card.pricing?.model ? 'high' : 'low'}
              sources={review.sources}
              collapsed={!showAllFacts}
            />
            <FactRow
              label="Starting Price"
              value={card.pricing?.starting_price || 'Not found'}
              confidence={card.pricing?.starting_price ? 'medium' : 'low'}
              sources={review.sources}
              onEdit={(val) => onUpdate(review.id, 'knowledge_card.pricing.starting_price', val)}
              collapsed={!showAllFacts}
            />
            <FactRow
              label="Free Tier"
              value={card.pricing?.has_free_tier ? 'Yes' : 'No'}
              confidence="medium"
              sources={review.sources}
              collapsed={!showAllFacts}
            />
            <FactRow
              label="Free Trial"
              value={
                card.pricing?.has_free_trial
                  ? card.pricing.trial_days
                    ? `${card.pricing.trial_days} days`
                    : 'Yes'
                  : 'No'
              }
              confidence="medium"
              sources={review.sources}
              collapsed={!showAllFacts}
            />

            {/* Integrations */}
            <FactRow
              label="API Access"
              value={card.integrations?.has_api ? 'Yes' : 'No'}
              confidence={card.integrations?.has_api !== undefined ? 'medium' : 'low'}
              sources={review.sources}
              collapsed={!showAllFacts}
            />
            <FactRow
              label="Zapier"
              value={card.integrations?.has_zapier ? 'Yes' : 'No'}
              confidence="medium"
              sources={review.sources}
              collapsed={!showAllFacts}
            />

            {/* Security - Often low confidence */}
            <FactRow
              label="SSO"
              value={
                card.security?.sso_available === true
                  ? 'Yes'
                  : card.security?.sso_available === false
                    ? 'No'
                    : 'Unknown'
              }
              confidence={card.security?.sso_available !== null ? 'medium' : 'low'}
              sources={review.sources}
              collapsed={!showAllFacts}
            />
            <FactRow
              label="SOC 2"
              value={
                card.security?.soc2_certified === true
                  ? 'Yes'
                  : card.security?.soc2_certified === false
                    ? 'No'
                    : 'Unknown'
              }
              confidence={card.security?.soc2_certified !== null ? 'high' : 'low'}
              sources={review.sources}
              collapsed={!showAllFacts}
            />
          </div>
        </div>
      )}

      {/* Pros & Cons */}
      <div className="p-6 space-y-4">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Pros</h3>
            <ul className="space-y-2">
              {(review.pros || []).map((pro, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">
                    <Check className="h-4 w-4" />
                  </span>
                  <EditableField
                    value={pro}
                    onSave={(val) => {
                      const newPros = [...(review.pros || [])];
                      newPros[i] = val;
                      onUpdate(review.id, 'pros', newPros);
                    }}
                    className="text-slate-600"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Cons</h3>
            <ul className="space-y-2">
              {(review.cons || []).map((con, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5">
                    <X className="h-4 w-4" />
                  </span>
                  <EditableField
                    value={con}
                    onSave={(val) => {
                      const newCons = [...(review.cons || [])];
                      newCons[i] = val;
                      onUpdate(review.id, 'cons', newCons);
                    }}
                    className="text-slate-600"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sources Panel */}
      {review.sources && review.sources.length > 0 && (
        <div className="px-6 pb-4">
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
              View {review.sources.length} source{review.sources.length > 1 ? 's' : ''}
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {review.sources.map((source, i) => (
                <li key={i}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hunt-600 hover:underline"
                  >
                    {source.title || source.url}
                  </a>
                  {source.type && (
                    <span className="ml-2 text-slate-400">({source.type})</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-slate-100 p-6 bg-slate-50">
        <div className="flex items-center justify-between">
          <a
            href={`/admin/review/${review.id}`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Full editor →
          </a>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => onReject(review.id)}
              disabled={isLoading}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Reject
            </Button>
            <Button
              type="button"
              onClick={() => onPublish(review.id)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
