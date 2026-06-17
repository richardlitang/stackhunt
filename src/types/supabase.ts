export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          ip_address: string | null;
          is_revoked: boolean;
          last_used_at: string;
          token_hash: string;
          user_agent: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          ip_address?: string | null;
          is_revoked?: boolean;
          last_used_at?: string;
          token_hash: string;
          user_agent?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          ip_address?: string | null;
          is_revoked?: boolean;
          last_used_at?: string;
          token_hash?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      affiliate_offers: {
        Row: {
          click_count: number | null;
          commission_note: string | null;
          created_at: string | null;
          cta_text: string | null;
          display_order: number | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          is_affiliate: boolean | null;
          is_primary: boolean | null;
          item_id: string;
          last_click_at: string | null;
          last_verified_at: string | null;
          network: string | null;
          network_program_id: string | null;
          network_tier: number | null;
          priority: number | null;
          tracking_params: Json | null;
          updated_at: string | null;
          url: string;
          verification_status: string | null;
        };
        Insert: {
          click_count?: number | null;
          commission_note?: string | null;
          created_at?: string | null;
          cta_text?: string | null;
          display_order?: number | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_affiliate?: boolean | null;
          is_primary?: boolean | null;
          item_id: string;
          last_click_at?: string | null;
          last_verified_at?: string | null;
          network?: string | null;
          network_program_id?: string | null;
          network_tier?: number | null;
          priority?: number | null;
          tracking_params?: Json | null;
          updated_at?: string | null;
          url: string;
          verification_status?: string | null;
        };
        Update: {
          click_count?: number | null;
          commission_note?: string | null;
          created_at?: string | null;
          cta_text?: string | null;
          display_order?: number | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_affiliate?: boolean | null;
          is_primary?: boolean | null;
          item_id?: string;
          last_click_at?: string | null;
          last_verified_at?: string | null;
          network?: string | null;
          network_program_id?: string | null;
          network_tier?: number | null;
          priority?: number | null;
          tracking_params?: Json | null;
          updated_at?: string | null;
          url?: string;
          verification_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      article_insights: {
        Row: {
          claim_type: string | null;
          confidence: number | null;
          context_id: string | null;
          created_at: string;
          id: string;
          insight: string;
          insight_type: string;
          item_id: string | null;
          source_type: string | null;
          source_url: string | null;
          tags: string[];
        };
        Insert: {
          claim_type?: string | null;
          confidence?: number | null;
          context_id?: string | null;
          created_at?: string;
          id?: string;
          insight: string;
          insight_type: string;
          item_id?: string | null;
          source_type?: string | null;
          source_url?: string | null;
          tags?: string[];
        };
        Update: {
          claim_type?: string | null;
          confidence?: number | null;
          context_id?: string | null;
          created_at?: string;
          id?: string;
          insight?: string;
          insight_type?: string;
          item_id?: string | null;
          source_type?: string | null;
          source_url?: string | null;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'article_insights_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'article_insights_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_insights_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      articles: {
        Row: {
          content_markdown: string | null;
          created_at: string;
          id: string;
          outline: Json | null;
          published_at: string | null;
          slug: string;
          source_context_ids: string[];
          source_data: Json | null;
          source_tool_ids: string[];
          status: string;
          summary_markdown: string | null;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          content_markdown?: string | null;
          created_at?: string;
          id?: string;
          outline?: Json | null;
          published_at?: string | null;
          slug: string;
          source_context_ids?: string[];
          source_data?: Json | null;
          source_tool_ids?: string[];
          status?: string;
          summary_markdown?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          content_markdown?: string | null;
          created_at?: string;
          id?: string;
          outline?: Json | null;
          published_at?: string | null;
          slug?: string;
          source_context_ids?: string[];
          source_data?: Json | null;
          source_tool_ids?: string[];
          status?: string;
          summary_markdown?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      best_snapshots: {
        Row: {
          computed_at: string;
          context_slug: string;
          created_at: string;
          id: string;
          policy_version: string;
          published_at: string | null;
          snapshot_json: Json;
          spec_version: string | null;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          computed_at?: string;
          context_slug: string;
          created_at?: string;
          id?: string;
          policy_version?: string;
          published_at?: string | null;
          snapshot_json: Json;
          spec_version?: string | null;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          computed_at?: string;
          context_slug?: string;
          created_at?: string;
          id?: string;
          policy_version?: string;
          published_at?: string | null;
          snapshot_json?: Json;
          spec_version?: string | null;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      bundle_components: {
        Row: {
          bundle_item_id: string;
          component_item_id: string;
          created_at: string | null;
          id: string;
          included: boolean | null;
          notes: string | null;
          plan_id: string | null;
        };
        Insert: {
          bundle_item_id: string;
          component_item_id: string;
          created_at?: string | null;
          id?: string;
          included?: boolean | null;
          notes?: string | null;
          plan_id?: string | null;
        };
        Update: {
          bundle_item_id?: string;
          component_item_id?: string;
          created_at?: string | null;
          id?: string;
          included?: boolean | null;
          notes?: string | null;
          plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_bundle_item_id_fkey';
            columns: ['bundle_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_components_component_item_id_fkey';
            columns: ['component_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          editorial_notes: string | null;
          icon: string | null;
          id: string;
          is_featured: boolean | null;
          name: string;
          pillar: Database['public']['Enums']['category_pillar'] | null;
          slug: string;
          type: Database['public']['Enums']['category_type'] | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          editorial_notes?: string | null;
          icon?: string | null;
          id?: string;
          is_featured?: boolean | null;
          name: string;
          pillar?: Database['public']['Enums']['category_pillar'] | null;
          slug: string;
          type?: Database['public']['Enums']['category_type'] | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          editorial_notes?: string | null;
          icon?: string | null;
          id?: string;
          is_featured?: boolean | null;
          name?: string;
          pillar?: Database['public']['Enums']['category_pillar'] | null;
          slug?: string;
          type?: Database['public']['Enums']['category_type'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          claim_type: string;
          confidence: number | null;
          context_id: string | null;
          extracted_at: string;
          id: string;
          intent: string | null;
          item_id: string;
          policy_snapshot: Json | null;
          source_domain: string | null;
          source_url: string | null;
          value_json: Json | null;
        };
        Insert: {
          claim_type: string;
          confidence?: number | null;
          context_id?: string | null;
          extracted_at?: string;
          id?: string;
          intent?: string | null;
          item_id: string;
          policy_snapshot?: Json | null;
          source_domain?: string | null;
          source_url?: string | null;
          value_json?: Json | null;
        };
        Update: {
          claim_type?: string;
          confidence?: number | null;
          context_id?: string | null;
          extracted_at?: string;
          id?: string;
          intent?: string | null;
          item_id?: string;
          policy_snapshot?: Json | null;
          source_domain?: string | null;
          source_url?: string | null;
          value_json?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'claims_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'claims_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claims_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      click_events: {
        Row: {
          clicked_at: string | null;
          country_code: string | null;
          id: string;
          ip_hash: string | null;
          item_id: string;
          offer_id: string;
          referrer: string | null;
          region: string | null;
          source_context_id: string | null;
          source_page: string | null;
          user_agent: string | null;
        };
        Insert: {
          clicked_at?: string | null;
          country_code?: string | null;
          id?: string;
          ip_hash?: string | null;
          item_id: string;
          offer_id: string;
          referrer?: string | null;
          region?: string | null;
          source_context_id?: string | null;
          source_page?: string | null;
          user_agent?: string | null;
        };
        Update: {
          clicked_at?: string | null;
          country_code?: string | null;
          id?: string;
          ip_hash?: string | null;
          item_id?: string;
          offer_id?: string;
          referrer?: string | null;
          region?: string | null;
          source_context_id?: string | null;
          source_page?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'click_events_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'affiliate_performance';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_source_context_id_fkey';
            columns: ['source_context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'click_events_source_context_id_fkey';
            columns: ['source_context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_source_context_id_fkey';
            columns: ['source_context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'click_events_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      compare_snapshots: {
        Row: {
          category_id: string | null;
          computed_at: string;
          created_at: string;
          id: string;
          policy_version: string;
          published_at: string | null;
          schema_id: string | null;
          snapshot_json: Json;
          spec_key: string | null;
          spec_version: string | null;
          status: string;
          tool_a_slug: string;
          tool_b_slug: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          category_id?: string | null;
          computed_at?: string;
          created_at?: string;
          id?: string;
          policy_version?: string;
          published_at?: string | null;
          schema_id?: string | null;
          snapshot_json: Json;
          spec_key?: string | null;
          spec_version?: string | null;
          status?: string;
          tool_a_slug: string;
          tool_b_slug: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          category_id?: string | null;
          computed_at?: string;
          created_at?: string;
          id?: string;
          policy_version?: string;
          published_at?: string | null;
          schema_id?: string | null;
          snapshot_json?: Json;
          spec_key?: string | null;
          spec_version?: string | null;
          status?: string;
          tool_a_slug?: string;
          tool_b_slug?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'compare_snapshots_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      comparison_insights: {
        Row: {
          choose_a_if: string[] | null;
          choose_b_if: string[] | null;
          created_at: string | null;
          curated_at: string | null;
          curator_notes: string | null;
          data_sources: string[] | null;
          generated_at: string | null;
          id: string;
          is_curated: boolean | null;
          item_a_id: string | null;
          item_a_slug: string;
          item_b_id: string | null;
          item_b_slug: string;
          migration_notes_a_to_b: string | null;
          migration_notes_b_to_a: string | null;
          substitutability_score: number | null;
          updated_at: string | null;
          verdict: string | null;
          why_switch_a_to_b: string[] | null;
          why_switch_b_to_a: string[] | null;
          winner_by_context: Json | null;
        };
        Insert: {
          choose_a_if?: string[] | null;
          choose_b_if?: string[] | null;
          created_at?: string | null;
          curated_at?: string | null;
          curator_notes?: string | null;
          data_sources?: string[] | null;
          generated_at?: string | null;
          id?: string;
          is_curated?: boolean | null;
          item_a_id?: string | null;
          item_a_slug: string;
          item_b_id?: string | null;
          item_b_slug: string;
          migration_notes_a_to_b?: string | null;
          migration_notes_b_to_a?: string | null;
          substitutability_score?: number | null;
          updated_at?: string | null;
          verdict?: string | null;
          why_switch_a_to_b?: string[] | null;
          why_switch_b_to_a?: string[] | null;
          winner_by_context?: Json | null;
        };
        Update: {
          choose_a_if?: string[] | null;
          choose_b_if?: string[] | null;
          created_at?: string | null;
          curated_at?: string | null;
          curator_notes?: string | null;
          data_sources?: string[] | null;
          generated_at?: string | null;
          id?: string;
          is_curated?: boolean | null;
          item_a_id?: string | null;
          item_a_slug?: string;
          item_b_id?: string | null;
          item_b_slug?: string;
          migration_notes_a_to_b?: string | null;
          migration_notes_b_to_a?: string | null;
          substitutability_score?: number | null;
          updated_at?: string | null;
          verdict?: string | null;
          why_switch_a_to_b?: string[] | null;
          why_switch_b_to_a?: string[] | null;
          winner_by_context?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_a_id_fkey';
            columns: ['item_a_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comparison_insights_item_b_id_fkey';
            columns: ['item_b_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      competitor_pages: {
        Row: {
          competitor_id: string | null;
          content_type: string | null;
          created_at: string | null;
          extracted_tools: Json | null;
          id: string;
          import_batch_id: string | null;
          keyword_count: number | null;
          last_checked: string | null;
          opportunity_score: number | null;
          referring_domains: number | null;
          top_keyword: string | null;
          top_keyword_position: number | null;
          top_keyword_volume: number | null;
          traffic: number | null;
          traffic_share: number | null;
          traffic_value: number | null;
          url: string;
        };
        Insert: {
          competitor_id?: string | null;
          content_type?: string | null;
          created_at?: string | null;
          extracted_tools?: Json | null;
          id?: string;
          import_batch_id?: string | null;
          keyword_count?: number | null;
          last_checked?: string | null;
          opportunity_score?: number | null;
          referring_domains?: number | null;
          top_keyword?: string | null;
          top_keyword_position?: number | null;
          top_keyword_volume?: number | null;
          traffic?: number | null;
          traffic_share?: number | null;
          traffic_value?: number | null;
          url: string;
        };
        Update: {
          competitor_id?: string | null;
          content_type?: string | null;
          created_at?: string | null;
          extracted_tools?: Json | null;
          id?: string;
          import_batch_id?: string | null;
          keyword_count?: number | null;
          last_checked?: string | null;
          opportunity_score?: number | null;
          referring_domains?: number | null;
          top_keyword?: string | null;
          top_keyword_position?: number | null;
          top_keyword_volume?: number | null;
          traffic?: number | null;
          traffic_share?: number | null;
          traffic_value?: number | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competitor_pages_competitor_id_fkey';
            columns: ['competitor_id'];
            isOneToOne: false;
            referencedRelation: 'competitors';
            referencedColumns: ['id'];
          },
        ];
      };
      competitors: {
        Row: {
          created_at: string | null;
          domain: string;
          id: string;
          is_active: boolean | null;
          name: string | null;
          notes: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          domain: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
          notes?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          domain?: string;
          id?: string;
          is_active?: boolean | null;
          name?: string | null;
          notes?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      content_ideas: {
        Row: {
          ai_classification: Json | null;
          approved_at: string | null;
          approved_by: string | null;
          clicks: number | null;
          clicks_per_search: number | null;
          content_type: string | null;
          context_query: string | null;
          cpc: number | null;
          created_at: string;
          duplicate_reason: string | null;
          duplicate_review_id: string | null;
          duplicate_tool_id: string | null;
          embedding: string | null;
          extracted_tools: Json | null;
          filtered_reason: string | null;
          id: string;
          import_batch_id: string | null;
          is_duplicate: boolean | null;
          keyword: string;
          keyword_difficulty: number | null;
          keyword_type: Database['public']['Enums']['keyword_type'] | null;
          notes: string | null;
          parent_keyword: string | null;
          pillar: string | null;
          priority: number | null;
          rejection_reason: string | null;
          return_rate: number | null;
          roi_score: number | null;
          search_volume: number | null;
          semantic_similarity: number | null;
          source: string;
          source_file: string | null;
          source_format: string | null;
          status: string;
          target_audience: string | null;
          tool_name: string | null;
          updated_at: string;
        };
        Insert: {
          ai_classification?: Json | null;
          approved_at?: string | null;
          approved_by?: string | null;
          clicks?: number | null;
          clicks_per_search?: number | null;
          content_type?: string | null;
          context_query?: string | null;
          cpc?: number | null;
          created_at?: string;
          duplicate_reason?: string | null;
          duplicate_review_id?: string | null;
          duplicate_tool_id?: string | null;
          embedding?: string | null;
          extracted_tools?: Json | null;
          filtered_reason?: string | null;
          id?: string;
          import_batch_id?: string | null;
          is_duplicate?: boolean | null;
          keyword: string;
          keyword_difficulty?: number | null;
          keyword_type?: Database['public']['Enums']['keyword_type'] | null;
          notes?: string | null;
          parent_keyword?: string | null;
          pillar?: string | null;
          priority?: number | null;
          rejection_reason?: string | null;
          return_rate?: number | null;
          roi_score?: number | null;
          search_volume?: number | null;
          semantic_similarity?: number | null;
          source?: string;
          source_file?: string | null;
          source_format?: string | null;
          status?: string;
          target_audience?: string | null;
          tool_name?: string | null;
          updated_at?: string;
        };
        Update: {
          ai_classification?: Json | null;
          approved_at?: string | null;
          approved_by?: string | null;
          clicks?: number | null;
          clicks_per_search?: number | null;
          content_type?: string | null;
          context_query?: string | null;
          cpc?: number | null;
          created_at?: string;
          duplicate_reason?: string | null;
          duplicate_review_id?: string | null;
          duplicate_tool_id?: string | null;
          embedding?: string | null;
          extracted_tools?: Json | null;
          filtered_reason?: string | null;
          id?: string;
          import_batch_id?: string | null;
          is_duplicate?: boolean | null;
          keyword?: string;
          keyword_difficulty?: number | null;
          keyword_type?: Database['public']['Enums']['keyword_type'] | null;
          notes?: string | null;
          parent_keyword?: string | null;
          pillar?: string | null;
          priority?: number | null;
          rejection_reason?: string | null;
          return_rate?: number | null;
          roi_score?: number | null;
          search_volume?: number | null;
          semantic_similarity?: number | null;
          source?: string;
          source_file?: string | null;
          source_format?: string | null;
          status?: string;
          target_audience?: string | null;
          tool_name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'content_ideas_duplicate_review_id_fkey';
            columns: ['duplicate_review_id'];
            isOneToOne: false;
            referencedRelation: 'admin_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_review_id_fkey';
            columns: ['duplicate_review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_ideas_duplicate_tool_id_fkey';
            columns: ['duplicate_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      context_specs: {
        Row: {
          archetypes_override: Json | null;
          category_id: string | null;
          context_slug: string;
          created_at: string;
          editorial_override: Json | null;
          hard_filters_override: Json | null;
          id: string;
          modifiers: Json;
          penalties_override: Json | null;
          schema_id: string;
          updated_at: string;
          version: number;
          weights_override: Json | null;
        };
        Insert: {
          archetypes_override?: Json | null;
          category_id?: string | null;
          context_slug: string;
          created_at?: string;
          editorial_override?: Json | null;
          hard_filters_override?: Json | null;
          id?: string;
          modifiers?: Json;
          penalties_override?: Json | null;
          schema_id: string;
          updated_at?: string;
          version?: number;
          weights_override?: Json | null;
        };
        Update: {
          archetypes_override?: Json | null;
          category_id?: string | null;
          context_slug?: string;
          created_at?: string;
          editorial_override?: Json | null;
          hard_filters_override?: Json | null;
          id?: string;
          modifiers?: Json;
          penalties_override?: Json | null;
          schema_id?: string;
          updated_at?: string;
          version?: number;
          weights_override?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'context_specs_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      contexts: {
        Row: {
          audience_category_id: string | null;
          category_id: string | null;
          created_at: string | null;
          discovery_query: string | null;
          function_category_id: string | null;
          id: string;
          intro_text: string | null;
          is_featured: boolean | null;
          last_discovery_at: string | null;
          meta_description: string | null;
          platform_category_id: string | null;
          primary_item_id: string | null;
          queued_tool_ids: string[] | null;
          slug: string;
          title: string;
          title_modifier: string | null;
          title_noun: string | null;
          title_template: Database['public']['Enums']['title_template'] | null;
          tool_count: number | null;
          updated_at: string | null;
        };
        Insert: {
          audience_category_id?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          discovery_query?: string | null;
          function_category_id?: string | null;
          id?: string;
          intro_text?: string | null;
          is_featured?: boolean | null;
          last_discovery_at?: string | null;
          meta_description?: string | null;
          platform_category_id?: string | null;
          primary_item_id?: string | null;
          queued_tool_ids?: string[] | null;
          slug: string;
          title: string;
          title_modifier?: string | null;
          title_noun?: string | null;
          title_template?: Database['public']['Enums']['title_template'] | null;
          tool_count?: number | null;
          updated_at?: string | null;
        };
        Update: {
          audience_category_id?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          discovery_query?: string | null;
          function_category_id?: string | null;
          id?: string;
          intro_text?: string | null;
          is_featured?: boolean | null;
          last_discovery_at?: string | null;
          meta_description?: string | null;
          platform_category_id?: string | null;
          primary_item_id?: string | null;
          queued_tool_ids?: string[] | null;
          slug?: string;
          title?: string;
          title_modifier?: string | null;
          title_noun?: string | null;
          title_template?: Database['public']['Enums']['title_template'] | null;
          tool_count?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contexts_audience_category_id_fkey';
            columns: ['audience_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_function_category_id_fkey';
            columns: ['function_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_platform_category_id_fkey';
            columns: ['platform_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      corrections: {
        Row: {
          admin_notes: string | null;
          ai_verification_notes: string | null;
          ai_verification_result: string | null;
          ai_verified: boolean | null;
          ai_verified_at: string | null;
          correction_text: string;
          created_at: string | null;
          field_name: string | null;
          id: string;
          ip_hash: string | null;
          item_id: string | null;
          reporter_email: string | null;
          reporter_type: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          review_id: string | null;
          status: string | null;
          verification_batch_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          ai_verification_notes?: string | null;
          ai_verification_result?: string | null;
          ai_verified?: boolean | null;
          ai_verified_at?: string | null;
          correction_text: string;
          created_at?: string | null;
          field_name?: string | null;
          id?: string;
          ip_hash?: string | null;
          item_id?: string | null;
          reporter_email?: string | null;
          reporter_type?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          review_id?: string | null;
          status?: string | null;
          verification_batch_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          ai_verification_notes?: string | null;
          ai_verification_result?: string | null;
          ai_verified?: boolean | null;
          ai_verified_at?: string | null;
          correction_text?: string;
          created_at?: string | null;
          field_name?: string | null;
          id?: string;
          ip_hash?: string | null;
          item_id?: string | null;
          reporter_email?: string | null;
          reporter_type?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          review_id?: string | null;
          status?: string | null;
          verification_batch_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'corrections_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'admin_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      hunt_queue: {
        Row: {
          attempts: number | null;
          batch_id: string | null;
          category_slug: string | null;
          claimed_at: string | null;
          claimed_by: string | null;
          completed_at: string | null;
          context_id: string | null;
          context_title: string | null;
          created_at: string | null;
          deadline_at: string | null;
          defunct_checked_at: string | null;
          defunct_processed_at: string | null;
          defunct_status: Json | null;
          detected_category: string | null;
          dlq_at: string | null;
          dlq_reason: string | null;
          duration_ms: number | null;
          entity_scope: string | null;
          error_details: Json | null;
          error_message: string | null;
          force_regenerate: boolean | null;
          heartbeat_at: string | null;
          hunt_type: string | null;
          id: string;
          is_discovery_hunt: boolean | null;
          item_id: string | null;
          last_completed_phase: number | null;
          max_attempts: number | null;
          phase_checkpoint: Json | null;
          priority: number | null;
          requested_by: string | null;
          research_completed_at: string | null;
          review_id: string | null;
          scheduled_for: string | null;
          source: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['hunt_queue_status'] | null;
          tokens_used: number | null;
          tool_name: string;
          tool_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          attempts?: number | null;
          batch_id?: string | null;
          category_slug?: string | null;
          claimed_at?: string | null;
          claimed_by?: string | null;
          completed_at?: string | null;
          context_id?: string | null;
          context_title?: string | null;
          created_at?: string | null;
          deadline_at?: string | null;
          defunct_checked_at?: string | null;
          defunct_processed_at?: string | null;
          defunct_status?: Json | null;
          detected_category?: string | null;
          dlq_at?: string | null;
          dlq_reason?: string | null;
          duration_ms?: number | null;
          entity_scope?: string | null;
          error_details?: Json | null;
          error_message?: string | null;
          force_regenerate?: boolean | null;
          heartbeat_at?: string | null;
          hunt_type?: string | null;
          id?: string;
          is_discovery_hunt?: boolean | null;
          item_id?: string | null;
          last_completed_phase?: number | null;
          max_attempts?: number | null;
          phase_checkpoint?: Json | null;
          priority?: number | null;
          requested_by?: string | null;
          research_completed_at?: string | null;
          review_id?: string | null;
          scheduled_for?: string | null;
          source?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['hunt_queue_status'] | null;
          tokens_used?: number | null;
          tool_name: string;
          tool_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          attempts?: number | null;
          batch_id?: string | null;
          category_slug?: string | null;
          claimed_at?: string | null;
          claimed_by?: string | null;
          completed_at?: string | null;
          context_id?: string | null;
          context_title?: string | null;
          created_at?: string | null;
          deadline_at?: string | null;
          defunct_checked_at?: string | null;
          defunct_processed_at?: string | null;
          defunct_status?: Json | null;
          detected_category?: string | null;
          dlq_at?: string | null;
          dlq_reason?: string | null;
          duration_ms?: number | null;
          entity_scope?: string | null;
          error_details?: Json | null;
          error_message?: string | null;
          force_regenerate?: boolean | null;
          heartbeat_at?: string | null;
          hunt_type?: string | null;
          id?: string;
          is_discovery_hunt?: boolean | null;
          item_id?: string | null;
          last_completed_phase?: number | null;
          max_attempts?: number | null;
          phase_checkpoint?: Json | null;
          priority?: number | null;
          requested_by?: string | null;
          research_completed_at?: string | null;
          review_id?: string | null;
          scheduled_for?: string | null;
          source?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['hunt_queue_status'] | null;
          tokens_used?: number | null;
          tool_name?: string;
          tool_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'admin_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      hunt_telemetry: {
        Row: {
          context_title: string | null;
          created_at: string;
          duration_ms: number | null;
          error_class: string | null;
          estimated_cost_usd: number | null;
          id: string;
          queue_item_id: string | null;
          retries: number | null;
          success: boolean;
          timeout_failures: number | null;
          tokens_analysis: number | null;
          tokens_research: number | null;
          tokens_total: number | null;
          tool_name: string;
        };
        Insert: {
          context_title?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error_class?: string | null;
          estimated_cost_usd?: number | null;
          id?: string;
          queue_item_id?: string | null;
          retries?: number | null;
          success: boolean;
          timeout_failures?: number | null;
          tokens_analysis?: number | null;
          tokens_research?: number | null;
          tokens_total?: number | null;
          tool_name: string;
        };
        Update: {
          context_title?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error_class?: string | null;
          estimated_cost_usd?: number | null;
          id?: string;
          queue_item_id?: string | null;
          retries?: number | null;
          success?: boolean;
          timeout_failures?: number | null;
          tokens_analysis?: number | null;
          tokens_research?: number | null;
          tokens_total?: number | null;
          tool_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hunt_telemetry_queue_item_id_fkey';
            columns: ['queue_item_id'];
            isOneToOne: false;
            referencedRelation: 'hunt_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_telemetry_queue_item_id_fkey';
            columns: ['queue_item_id'];
            isOneToOne: false;
            referencedRelation: 'hunt_queue_dashboard';
            referencedColumns: ['id'];
          },
        ];
      };
      hunt_validations: {
        Row: {
          created_at: string | null;
          human_review_required: boolean;
          id: string;
          is_valid: boolean;
          quality_score: number;
          queue_item_id: string | null;
          should_publish: boolean;
          tool_id: string | null;
          validation_type: string;
          validations: Json | null;
        };
        Insert: {
          created_at?: string | null;
          human_review_required: boolean;
          id?: string;
          is_valid: boolean;
          quality_score: number;
          queue_item_id?: string | null;
          should_publish: boolean;
          tool_id?: string | null;
          validation_type: string;
          validations?: Json | null;
        };
        Update: {
          created_at?: string | null;
          human_review_required?: boolean;
          id?: string;
          is_valid?: boolean;
          quality_score?: number;
          queue_item_id?: string | null;
          should_publish?: boolean;
          tool_id?: string | null;
          validation_type?: string;
          validations?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hunt_validations_queue_item_id_fkey';
            columns: ['queue_item_id'];
            isOneToOne: false;
            referencedRelation: 'hunt_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_queue_item_id_fkey';
            columns: ['queue_item_id'];
            isOneToOne: false;
            referencedRelation: 'hunt_queue_dashboard';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_validations_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      import_batches: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          duplicate_rows: number;
          error_rows: number;
          filename: string;
          id: string;
          imported_rows: number;
          notes: string | null;
          status: string;
          total_rows: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          duplicate_rows?: number;
          error_rows?: number;
          filename: string;
          id?: string;
          imported_rows?: number;
          notes?: string | null;
          status?: string;
          total_rows: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          duplicate_rows?: number;
          error_rows?: number;
          filename?: string;
          id?: string;
          imported_rows?: number;
          notes?: string | null;
          status?: string;
          total_rows?: number;
        };
        Relationships: [];
      };
      item_audience_fit: {
        Row: {
          category_id: string;
          created_at: string | null;
          fit_type: string;
          id: string;
          item_id: string;
          reason: string | null;
        };
        Insert: {
          category_id: string;
          created_at?: string | null;
          fit_type: string;
          id?: string;
          item_id: string;
          reason?: string | null;
        };
        Update: {
          category_id?: string;
          created_at?: string | null;
          fit_type?: string;
          id?: string;
          item_id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'item_audience_fit_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_audience_fit_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      item_category_links: {
        Row: {
          category_id: string;
          created_at: string | null;
          id: string;
          item_id: string;
          relevance_score: number | null;
        };
        Insert: {
          category_id: string;
          created_at?: string | null;
          id?: string;
          item_id: string;
          relevance_score?: number | null;
        };
        Update: {
          category_id?: string;
          created_at?: string | null;
          id?: string;
          item_id?: string;
          relevance_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tool_category_links_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      item_fact_packs: {
        Row: {
          checked_at: string;
          created_at: string;
          evidence_json: Json;
          facts_json: Json;
          id: string;
          item_id: string;
          quality_json: Json;
          schema_id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          checked_at?: string;
          created_at?: string;
          evidence_json?: Json;
          facts_json?: Json;
          id?: string;
          item_id: string;
          quality_json?: Json;
          schema_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          checked_at?: string;
          created_at?: string;
          evidence_json?: Json;
          facts_json?: Json;
          id?: string;
          item_id?: string;
          quality_json?: Json;
          schema_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          avg_score: number | null;
          base_score: number | null;
          base_score_breakdown: Json | null;
          confirmed_correction_count: number | null;
          correction_count: number | null;
          created_at: string | null;
          data_confidence: number | null;
          embedding: string | null;
          embedding_model: string | null;
          embedding_version: string | null;
          id: string;
          is_featured: boolean | null;
          is_verified: boolean | null;
          last_major_update: string | null;
          last_user_verified_at: string | null;
          learning_curve: Database['public']['Enums']['learning_curve'] | null;
          logo_path: string | null;
          logo_url: string | null;
          long_description: string | null;
          metadata: Json | null;
          name: string;
          parent_id: string | null;
          pricing_confidence: string | null;
          pricing_type: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at: string | null;
          quality_review_completed_at: string | null;
          quality_review_flagged_at: string | null;
          quality_review_needed: boolean | null;
          quality_review_reason: string | null;
          quality_review_result: string | null;
          review_context: Json | null;
          review_count: number | null;
          short_description: string | null;
          slug: string;
          specs: Json | null;
          target_market: string | null;
          type: Database['public']['Enums']['item_type'];
          updated_at: string | null;
          user_verifications_this_week: number | null;
          verdict: string | null;
          video_id: string | null;
          video_title: string | null;
          website: string | null;
        };
        Insert: {
          avg_score?: number | null;
          base_score?: number | null;
          base_score_breakdown?: Json | null;
          confirmed_correction_count?: number | null;
          correction_count?: number | null;
          created_at?: string | null;
          data_confidence?: number | null;
          embedding?: string | null;
          embedding_model?: string | null;
          embedding_version?: string | null;
          id?: string;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          last_major_update?: string | null;
          last_user_verified_at?: string | null;
          learning_curve?: Database['public']['Enums']['learning_curve'] | null;
          logo_path?: string | null;
          logo_url?: string | null;
          long_description?: string | null;
          metadata?: Json | null;
          name: string;
          parent_id?: string | null;
          pricing_confidence?: string | null;
          pricing_type?: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at?: string | null;
          quality_review_completed_at?: string | null;
          quality_review_flagged_at?: string | null;
          quality_review_needed?: boolean | null;
          quality_review_reason?: string | null;
          quality_review_result?: string | null;
          review_context?: Json | null;
          review_count?: number | null;
          short_description?: string | null;
          slug: string;
          specs?: Json | null;
          target_market?: string | null;
          type?: Database['public']['Enums']['item_type'];
          updated_at?: string | null;
          user_verifications_this_week?: number | null;
          verdict?: string | null;
          video_id?: string | null;
          video_title?: string | null;
          website?: string | null;
        };
        Update: {
          avg_score?: number | null;
          base_score?: number | null;
          base_score_breakdown?: Json | null;
          confirmed_correction_count?: number | null;
          correction_count?: number | null;
          created_at?: string | null;
          data_confidence?: number | null;
          embedding?: string | null;
          embedding_model?: string | null;
          embedding_version?: string | null;
          id?: string;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          last_major_update?: string | null;
          last_user_verified_at?: string | null;
          learning_curve?: Database['public']['Enums']['learning_curve'] | null;
          logo_path?: string | null;
          logo_url?: string | null;
          long_description?: string | null;
          metadata?: Json | null;
          name?: string;
          parent_id?: string | null;
          pricing_confidence?: string | null;
          pricing_type?: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at?: string | null;
          quality_review_completed_at?: string | null;
          quality_review_flagged_at?: string | null;
          quality_review_needed?: boolean | null;
          quality_review_reason?: string | null;
          quality_review_result?: string | null;
          review_context?: Json | null;
          review_count?: number | null;
          short_description?: string | null;
          slug?: string;
          specs?: Json | null;
          target_market?: string | null;
          type?: Database['public']['Enums']['item_type'];
          updated_at?: string | null;
          user_verifications_this_week?: number | null;
          verdict?: string | null;
          video_id?: string | null;
          video_title?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      market_state: {
        Row: {
          check_frequency_hours: number | null;
          confidence_score: number | null;
          created_at: string | null;
          has_free_tier: boolean | null;
          has_free_trial: boolean | null;
          id: string;
          in_stock: boolean | null;
          is_available: boolean | null;
          is_deprecated: boolean | null;
          item_id: string;
          last_verified_at: string | null;
          next_check_at: string | null;
          price_cents: number | null;
          price_currency: string | null;
          price_display: string | null;
          price_interval: string | null;
          source_provider: string | null;
          source_raw: Json | null;
          source_type: string;
          source_url: string | null;
          stock_quantity: number | null;
          trial_days: number | null;
          updated_at: string | null;
          verification_note: string | null;
        };
        Insert: {
          check_frequency_hours?: number | null;
          confidence_score?: number | null;
          created_at?: string | null;
          has_free_tier?: boolean | null;
          has_free_trial?: boolean | null;
          id?: string;
          in_stock?: boolean | null;
          is_available?: boolean | null;
          is_deprecated?: boolean | null;
          item_id: string;
          last_verified_at?: string | null;
          next_check_at?: string | null;
          price_cents?: number | null;
          price_currency?: string | null;
          price_display?: string | null;
          price_interval?: string | null;
          source_provider?: string | null;
          source_raw?: Json | null;
          source_type: string;
          source_url?: string | null;
          stock_quantity?: number | null;
          trial_days?: number | null;
          updated_at?: string | null;
          verification_note?: string | null;
        };
        Update: {
          check_frequency_hours?: number | null;
          confidence_score?: number | null;
          created_at?: string | null;
          has_free_tier?: boolean | null;
          has_free_trial?: boolean | null;
          id?: string;
          in_stock?: boolean | null;
          is_available?: boolean | null;
          is_deprecated?: boolean | null;
          item_id?: string;
          last_verified_at?: string | null;
          next_check_at?: string | null;
          price_cents?: number | null;
          price_currency?: string | null;
          price_display?: string | null;
          price_interval?: string | null;
          source_provider?: string | null;
          source_raw?: Json | null;
          source_type?: string;
          source_url?: string | null;
          stock_quantity?: number | null;
          trial_days?: number | null;
          updated_at?: string | null;
          verification_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      pipeline_metrics: {
        Row: {
          id: string;
          metric_type: string;
          metric_value: number;
          recorded_at: string | null;
          tags: Json | null;
        };
        Insert: {
          id?: string;
          metric_type: string;
          metric_value: number;
          recorded_at?: string | null;
          tags?: Json | null;
        };
        Update: {
          id?: string;
          metric_type?: string;
          metric_value?: number;
          recorded_at?: string | null;
          tags?: Json | null;
        };
        Relationships: [];
      };
      price_history: {
        Row: {
          id: string;
          item_id: string;
          price_cents: number | null;
          price_currency: string | null;
          price_display: string | null;
          recorded_at: string | null;
          source_provider: string | null;
          source_type: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          price_cents?: number | null;
          price_currency?: string | null;
          price_display?: string | null;
          recorded_at?: string | null;
          source_provider?: string | null;
          source_type?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          price_cents?: number | null;
          price_currency?: string | null;
          price_display?: string | null;
          recorded_at?: string | null;
          source_provider?: string | null;
          source_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_history_tool_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      price_verifications: {
        Row: {
          created_at: string | null;
          id: string;
          ip_hash: string | null;
          is_accurate: boolean;
          item_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          ip_hash?: string | null;
          is_accurate: boolean;
          item_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          ip_hash?: string | null;
          is_accurate?: boolean;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'price_verifications_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          endpoint: string;
          id: string;
          identifier: string;
          request_count: number;
          window_start: string;
        };
        Insert: {
          endpoint: string;
          id?: string;
          identifier: string;
          request_count?: number;
          window_start?: string;
        };
        Update: {
          endpoint?: string;
          id?: string;
          identifier?: string;
          request_count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          cons: Json | null;
          context_id: string | null;
          created_at: string | null;
          dealbreakers: string[] | null;
          display_order: number | null;
          downvotes: number | null;
          fit_score: number | null;
          generation_quality: Json | null;
          id: string;
          item_id: string;
          pros: Json | null;
          published_at: string | null;
          quality: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          reviewer_id: string | null;
          reviewer_notes: string | null;
          score: number | null;
          sentiment_tags: Json | null;
          sources: Json | null;
          standout_features: string[] | null;
          status: Database['public']['Enums']['content_status'] | null;
          summary_markdown: string | null;
          switching_from: string[] | null;
          updated_at: string | null;
          upvotes: number | null;
          value_rating: number | null;
        };
        Insert: {
          cons?: Json | null;
          context_id?: string | null;
          created_at?: string | null;
          dealbreakers?: string[] | null;
          display_order?: number | null;
          downvotes?: number | null;
          fit_score?: number | null;
          generation_quality?: Json | null;
          id?: string;
          item_id: string;
          pros?: Json | null;
          published_at?: string | null;
          quality?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          score?: number | null;
          sentiment_tags?: Json | null;
          sources?: Json | null;
          standout_features?: string[] | null;
          status?: Database['public']['Enums']['content_status'] | null;
          summary_markdown?: string | null;
          switching_from?: string[] | null;
          updated_at?: string | null;
          upvotes?: number | null;
          value_rating?: number | null;
        };
        Update: {
          cons?: Json | null;
          context_id?: string | null;
          created_at?: string | null;
          dealbreakers?: string[] | null;
          display_order?: number | null;
          downvotes?: number | null;
          fit_score?: number | null;
          generation_quality?: Json | null;
          id?: string;
          item_id?: string;
          pros?: Json | null;
          published_at?: string | null;
          quality?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          reviewer_id?: string | null;
          reviewer_notes?: string | null;
          score?: number | null;
          sentiment_tags?: Json | null;
          sources?: Json | null;
          standout_features?: string[] | null;
          status?: Database['public']['Enums']['content_status'] | null;
          summary_markdown?: string | null;
          switching_from?: string[] | null;
          updated_at?: string | null;
          upvotes?: number | null;
          value_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'reviews_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      signal_aggregates: {
        Row: {
          count_negative: number | null;
          count_positive: number | null;
          count_total: number | null;
          id: string;
          item_id: string;
          last_updated: string | null;
          option_id: string | null;
          signal_id: string;
        };
        Insert: {
          count_negative?: number | null;
          count_positive?: number | null;
          count_total?: number | null;
          id?: string;
          item_id: string;
          last_updated?: string | null;
          option_id?: string | null;
          signal_id: string;
        };
        Update: {
          count_negative?: number | null;
          count_positive?: number | null;
          count_total?: number | null;
          id?: string;
          item_id?: string;
          last_updated?: string | null;
          option_id?: string | null;
          signal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'signal_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signal_aggregates_signal_id_fkey';
            columns: ['signal_id'];
            isOneToOne: false;
            referencedRelation: 'signal_definitions';
            referencedColumns: ['id'];
          },
        ];
      };
      signal_definitions: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          key: string;
          label: string;
          updated_at: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          key: string;
          label: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          key?: string;
          label?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      signal_options: {
        Row: {
          created_at: string | null;
          display_order: number | null;
          id: string;
          key: string;
          label: string;
          signal_id: string;
        };
        Insert: {
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          key: string;
          label: string;
          signal_id: string;
        };
        Update: {
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          key?: string;
          label?: string;
          signal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signal_options_signal_id_fkey';
            columns: ['signal_id'];
            isOneToOne: false;
            referencedRelation: 'signal_definitions';
            referencedColumns: ['id'];
          },
        ];
      };
      source_policy_registry: {
        Row: {
          acquisition_mode: string;
          created_at: string;
          display_mode: string;
          domain: string;
          last_reviewed_at: string | null;
          llm_ingestion_allowed: string;
          max_chars_ingested: number | null;
          notes: string | null;
          path_overrides: Json | null;
          policy_version: string | null;
          review_status: string;
          storage_mode: string;
          tos_url: string | null;
          updated_at: string;
        };
        Insert: {
          acquisition_mode: string;
          created_at?: string;
          display_mode: string;
          domain: string;
          last_reviewed_at?: string | null;
          llm_ingestion_allowed: string;
          max_chars_ingested?: number | null;
          notes?: string | null;
          path_overrides?: Json | null;
          policy_version?: string | null;
          review_status?: string;
          storage_mode: string;
          tos_url?: string | null;
          updated_at?: string;
        };
        Update: {
          acquisition_mode?: string;
          created_at?: string;
          display_mode?: string;
          domain?: string;
          last_reviewed_at?: string | null;
          llm_ingestion_allowed?: string;
          max_chars_ingested?: number | null;
          notes?: string | null;
          path_overrides?: Json | null;
          policy_version?: string | null;
          review_status?: string;
          storage_mode?: string;
          tos_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_policy_review_queue: {
        Row: {
          count_seen: number;
          domain: string;
          first_seen_at: string;
          last_seen_at: string;
          sample_titles: Json | null;
          sample_urls: Json | null;
          status: string;
          suggested_tos_url: string | null;
          updated_at: string;
        };
        Insert: {
          count_seen?: number;
          domain: string;
          first_seen_at?: string;
          last_seen_at?: string;
          sample_titles?: Json | null;
          sample_urls?: Json | null;
          status?: string;
          suggested_tos_url?: string | null;
          updated_at?: string;
        };
        Update: {
          count_seen?: number;
          domain?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          sample_titles?: Json | null;
          sample_urls?: Json | null;
          status?: string;
          suggested_tos_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      user_signals: {
        Row: {
          created_at: string | null;
          fingerprint_hash: string | null;
          id: string;
          ip_hash: string;
          item_id: string;
          option_id: string | null;
          signal_id: string;
          source_page: string | null;
          user_agent: string | null;
          value_bool: boolean | null;
          value_num: number | null;
          value_text: string | null;
        };
        Insert: {
          created_at?: string | null;
          fingerprint_hash?: string | null;
          id?: string;
          ip_hash: string;
          item_id: string;
          option_id?: string | null;
          signal_id: string;
          source_page?: string | null;
          user_agent?: string | null;
          value_bool?: boolean | null;
          value_num?: number | null;
          value_text?: string | null;
        };
        Update: {
          created_at?: string | null;
          fingerprint_hash?: string | null;
          id?: string;
          ip_hash?: string;
          item_id?: string;
          option_id?: string | null;
          signal_id?: string;
          source_page?: string | null;
          user_agent?: string | null;
          value_bool?: boolean | null;
          value_num?: number | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'signal_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_signals_signal_id_fkey';
            columns: ['signal_id'];
            isOneToOne: false;
            referencedRelation: 'signal_definitions';
            referencedColumns: ['id'];
          },
        ];
      };
      verification_batches: {
        Row: {
          admin_notified: boolean | null;
          completed_at: string | null;
          corrections_confirmed: number | null;
          corrections_inconclusive: number | null;
          corrections_rejected: number | null;
          error_message: string | null;
          id: string;
          notification_sent_at: string | null;
          oldest_correction_days: number | null;
          pending_count_at_start: number;
          started_at: string;
          status: string | null;
          tokens_used: number | null;
          tools_checked: number | null;
          trigger_reason: string;
        };
        Insert: {
          admin_notified?: boolean | null;
          completed_at?: string | null;
          corrections_confirmed?: number | null;
          corrections_inconclusive?: number | null;
          corrections_rejected?: number | null;
          error_message?: string | null;
          id?: string;
          notification_sent_at?: string | null;
          oldest_correction_days?: number | null;
          pending_count_at_start: number;
          started_at?: string;
          status?: string | null;
          tokens_used?: number | null;
          tools_checked?: number | null;
          trigger_reason: string;
        };
        Update: {
          admin_notified?: boolean | null;
          completed_at?: string | null;
          corrections_confirmed?: number | null;
          corrections_inconclusive?: number | null;
          corrections_rejected?: number | null;
          error_message?: string | null;
          id?: string;
          notification_sent_at?: string | null;
          oldest_correction_days?: number | null;
          pending_count_at_start?: number;
          started_at?: string;
          status?: string | null;
          tokens_used?: number | null;
          tools_checked?: number | null;
          trigger_reason?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      admin_review_queue: {
        Row: {
          cons: Json | null;
          context_slug: string | null;
          context_title: string | null;
          created_at: string | null;
          id: string | null;
          pros: Json | null;
          score: number | null;
          sentiment_tags: Json | null;
          sources: Json | null;
          status: Database['public']['Enums']['content_status'] | null;
          summary_markdown: string | null;
          tool_logo: string | null;
          tool_name: string | null;
          tool_slug: string | null;
        };
        Relationships: [];
      };
      affiliate_performance: {
        Row: {
          click_count: number | null;
          clicks_30d: number | null;
          clicks_7d: number | null;
          expires_at: string | null;
          id: string | null;
          is_active: boolean | null;
          is_affiliate: boolean | null;
          last_click_at: string | null;
          network: string | null;
          priority: number | null;
          tool_id: string | null;
          tool_name: string | null;
          tool_slug: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'affiliate_offers_item_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      batch_synthesis_status: {
        Row: {
          batch_completed: number | null;
          category: string | null;
          individual_completed: number | null;
          oldest_pending: string | null;
          pending_synthesis: number | null;
          stale_count: number | null;
        };
        Relationships: [];
      };
      best_snapshots_published_v: {
        Row: {
          computed_at: string | null;
          context_slug: string | null;
          created_at: string | null;
          id: string | null;
          policy_version: string | null;
          published_at: string | null;
          snapshot_json: Json | null;
          spec_version: string | null;
          status: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          computed_at?: string | null;
          context_slug?: string | null;
          created_at?: string | null;
          id?: string | null;
          policy_version?: string | null;
          published_at?: string | null;
          snapshot_json?: Json | null;
          spec_version?: string | null;
          status?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          computed_at?: string | null;
          context_slug?: string | null;
          created_at?: string | null;
          id?: string | null;
          policy_version?: string | null;
          published_at?: string | null;
          snapshot_json?: Json | null;
          spec_version?: string | null;
          status?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      categories_by_pillar: {
        Row: {
          categories: Json | null;
          pillar: Database['public']['Enums']['category_pillar'] | null;
          type: Database['public']['Enums']['category_type'] | null;
        };
        Relationships: [];
      };
      categories_by_type: {
        Row: {
          categories: Json | null;
          type: Database['public']['Enums']['category_type'] | null;
        };
        Relationships: [];
      };
      compare_snapshots_published_v: {
        Row: {
          category_id: string | null;
          computed_at: string | null;
          created_at: string | null;
          id: string | null;
          policy_version: string | null;
          published_at: string | null;
          schema_id: string | null;
          snapshot_json: Json | null;
          spec_key: string | null;
          spec_version: string | null;
          status: string | null;
          tool_a_slug: string | null;
          tool_b_slug: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          category_id?: string | null;
          computed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          policy_version?: string | null;
          published_at?: string | null;
          schema_id?: string | null;
          snapshot_json?: Json | null;
          spec_key?: string | null;
          spec_version?: string | null;
          status?: string | null;
          tool_a_slug?: string | null;
          tool_b_slug?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          category_id?: string | null;
          computed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          policy_version?: string | null;
          published_at?: string | null;
          schema_id?: string | null;
          snapshot_json?: Json | null;
          spec_key?: string | null;
          spec_version?: string | null;
          status?: string | null;
          tool_a_slug?: string | null;
          tool_b_slug?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'compare_snapshots_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      competitor_keyword_gaps: {
        Row: {
          competitor_domain: string | null;
          competitor_position: number | null;
          competitor_rd: number | null;
          competitor_traffic_value: number | null;
          competitor_url: string | null;
          keyword: string | null;
          opportunity_score: number | null;
          our_content_idea_id: string | null;
          our_context_id: string | null;
          our_status: string | null;
          volume: number | null;
        };
        Relationships: [];
      };
      competitor_opportunities: {
        Row: {
          competitor: string | null;
          difficulty: string | null;
          id: string | null;
          opportunity_score: number | null;
          opportunity_tier: string | null;
          their_position: number | null;
          their_rd: number | null;
          top_keyword: string | null;
          traffic: number | null;
          traffic_value: number | null;
          url: string | null;
          volume: number | null;
        };
        Relationships: [];
      };
      context_performance: {
        Row: {
          avg_tool_score: number | null;
          category_name: string | null;
          review_count: number | null;
          slug: string | null;
          title: string | null;
          tool_count: number | null;
          total_downvotes: number | null;
          total_upvotes: number | null;
        };
        Relationships: [];
      };
      contexts_with_title: {
        Row: {
          audience_category_id: string | null;
          audience_name: string | null;
          audience_slug: string | null;
          category_id: string | null;
          computed_title: string | null;
          created_at: string | null;
          function_category_id: string | null;
          function_name: string | null;
          function_slug: string | null;
          id: string | null;
          intro_text: string | null;
          is_featured: boolean | null;
          meta_description: string | null;
          platform_category_id: string | null;
          platform_name: string | null;
          platform_slug: string | null;
          primary_tool_id: string | null;
          slug: string | null;
          title: string | null;
          title_modifier: string | null;
          title_noun: string | null;
          title_template: Database['public']['Enums']['title_template'] | null;
          tool_count: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contexts_audience_category_id_fkey';
            columns: ['audience_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_function_category_id_fkey';
            columns: ['function_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_platform_category_id_fkey';
            columns: ['platform_category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contexts_primary_item_id_fkey';
            columns: ['primary_tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      corrections_by_tool: {
        Row: {
          correction_count: number | null;
          correction_ids: string[] | null;
          field_names: string[] | null;
          newest_correction: string | null;
          oldest_correction: string | null;
          tool_id: string | null;
          tool_name: string | null;
          tool_slug: string | null;
          tool_website: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'corrections_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      freelancer_friendly_tools: {
        Row: {
          avg_score: number | null;
          category_name: string | null;
          category_slug: string | null;
          cost_tier: string | null;
          has_free_tier: boolean | null;
          id: string | null;
          is_open_source: boolean | null;
          logo_url: string | null;
          name: string | null;
          pillar: Database['public']['Enums']['category_pillar'] | null;
          pricing_type: Database['public']['Enums']['pricing_model'] | null;
          short_description: string | null;
          slug: string | null;
        };
        Relationships: [];
      };
      hunt_queue_dashboard: {
        Row: {
          attempts: number | null;
          category_slug: string | null;
          claimed_at: string | null;
          claimed_by: string | null;
          completed_at: string | null;
          context_id: string | null;
          context_title: string | null;
          created_at: string | null;
          deadline_at: string | null;
          duration_ms: number | null;
          error_details: Json | null;
          error_message: string | null;
          force_regenerate: boolean | null;
          heartbeat_at: string | null;
          hunt_type: string | null;
          id: string | null;
          is_overdue: boolean | null;
          is_stale: boolean | null;
          max_attempts: number | null;
          priority: number | null;
          requested_by: string | null;
          resolved_tool_name: string | null;
          resolved_tool_slug: string | null;
          review_id: string | null;
          scheduled_for: string | null;
          source: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['hunt_queue_status'] | null;
          tokens_used: number | null;
          tool_id: string | null;
          tool_name: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'competitor_keyword_gaps';
            referencedColumns: ['our_context_id'];
          },
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_context_id_fkey';
            columns: ['context_id'];
            isOneToOne: false;
            referencedRelation: 'contexts_with_title';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'admin_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hunt_queue_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      hunt_queue_metrics: {
        Row: {
          completed_count: number | null;
          failed_count: number | null;
          pending_count: number | null;
          processing_count: number | null;
          queue_health: string | null;
          queue_utilization_pct: number | null;
        };
        Relationships: [];
      };
      hunt_queue_stats: {
        Row: {
          avg_duration_ms: number | null;
          avg_tokens: number | null;
          claimed_count: number | null;
          completed_count: number | null;
          failed_count: number | null;
          pending_count: number | null;
          processing_count: number | null;
        };
        Relationships: [];
      };
      import_batch_summary: {
        Row: {
          approved_count: number | null;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          duplicate_rate: number | null;
          duplicate_rows: number | null;
          error_rows: number | null;
          filename: string | null;
          id: string | null;
          imported_rows: number | null;
          queued_count: number | null;
          status: string | null;
          success_rate: number | null;
          total_rows: number | null;
        };
        Insert: {
          approved_count?: never;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          duplicate_rate?: never;
          duplicate_rows?: number | null;
          error_rows?: number | null;
          filename?: string | null;
          id?: string | null;
          imported_rows?: number | null;
          queued_count?: never;
          status?: string | null;
          success_rate?: never;
          total_rows?: number | null;
        };
        Update: {
          approved_count?: never;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          duplicate_rate?: never;
          duplicate_rows?: number | null;
          error_rows?: number | null;
          filename?: string | null;
          id?: string | null;
          imported_rows?: number | null;
          queued_count?: never;
          status?: string | null;
          success_rate?: never;
          total_rows?: number | null;
        };
        Relationships: [];
      };
      market_state_freshness: {
        Row: {
          check_frequency_hours: number | null;
          confidence_score: number | null;
          created_at: string | null;
          freshness: string | null;
          has_free_tier: boolean | null;
          has_free_trial: boolean | null;
          hours_since_verified: number | null;
          id: string | null;
          in_stock: boolean | null;
          is_available: boolean | null;
          is_deprecated: boolean | null;
          last_verified_at: string | null;
          next_check_at: string | null;
          price_cents: number | null;
          price_currency: string | null;
          price_display: string | null;
          price_interval: string | null;
          source_provider: string | null;
          source_raw: Json | null;
          source_type: string | null;
          source_url: string | null;
          stock_quantity: number | null;
          tool_id: string | null;
          tool_name: string | null;
          tool_slug: string | null;
          trial_days: number | null;
          updated_at: string | null;
          verification_note: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'market_state_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: true;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_audit: {
        Row: {
          days_since_verification: number | null;
          has_smp_pricing: boolean | null;
          id: string | null;
          name: string | null;
          plan_count: number | null;
          pricing_confidence: string | null;
          pricing_type: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at: string | null;
          slug: string | null;
          updated_at: string | null;
        };
        Insert: {
          days_since_verification?: never;
          has_smp_pricing?: never;
          id?: string | null;
          name?: string | null;
          plan_count?: never;
          pricing_confidence?: string | null;
          pricing_type?: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at?: string | null;
          slug?: string | null;
          updated_at?: string | null;
        };
        Update: {
          days_since_verification?: never;
          has_smp_pricing?: never;
          id?: string | null;
          name?: string | null;
          plan_count?: never;
          pricing_confidence?: string | null;
          pricing_type?: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at?: string | null;
          slug?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pricing_refresh_candidates: {
        Row: {
          days_since_verification: number | null;
          id: string | null;
          name: string | null;
          pricing_confidence: string | null;
          pricing_verified_at: string | null;
          slug: string | null;
        };
        Insert: {
          days_since_verification?: never;
          id?: string | null;
          name?: string | null;
          pricing_confidence?: string | null;
          pricing_verified_at?: string | null;
          slug?: string | null;
        };
        Update: {
          days_since_verification?: never;
          id?: string | null;
          name?: string | null;
          pricing_confidence?: string | null;
          pricing_verified_at?: string | null;
          slug?: string | null;
        };
        Relationships: [];
      };
      quality_review_queue: {
        Row: {
          confirmed_corrections: number | null;
          correction_count: number | null;
          days_pending: number | null;
          flagged_at: string | null;
          id: string | null;
          name: string | null;
          reason: string | null;
          recent_corrections: Json | null;
          slug: string | null;
        };
        Insert: {
          confirmed_corrections?: number | null;
          correction_count?: number | null;
          days_pending?: never;
          flagged_at?: string | null;
          id?: string | null;
          name?: string | null;
          reason?: string | null;
          recent_corrections?: never;
          slug?: string | null;
        };
        Update: {
          confirmed_corrections?: number | null;
          correction_count?: number | null;
          days_pending?: never;
          flagged_at?: string | null;
          id?: string | null;
          name?: string | null;
          reason?: string | null;
          recent_corrections?: never;
          slug?: string | null;
        };
        Relationships: [];
      };
      strategy_war_room: {
        Row: {
          content_type: string | null;
          context_query: string | null;
          cpc: number | null;
          created_at: string | null;
          duplicate_reason: string | null;
          duplicate_tool_name: string | null;
          duplicate_tool_slug: string | null;
          id: string | null;
          is_duplicate: boolean | null;
          keyword: string | null;
          keyword_difficulty: number | null;
          notes: string | null;
          pillar: string | null;
          priority: number | null;
          priority_tier: string | null;
          roi_score: number | null;
          search_volume: number | null;
          source: string | null;
          source_file: string | null;
          source_format: string | null;
          status: string | null;
          status_tier: string | null;
          target_audience: string | null;
          tool_name: string | null;
        };
        Relationships: [];
      };
      tool_category_links: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          id: string | null;
          item_id: string | null;
          relevance_score: number | null;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          item_id?: string | null;
          relevance_score?: number | null;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          item_id?: string | null;
          relevance_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_category_links_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tool_category_links_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      tool_fact_packs: {
        Row: {
          checked_at: string | null;
          created_at: string | null;
          evidence_json: Json | null;
          facts_json: Json | null;
          id: string | null;
          item_id: string | null;
          quality_json: Json | null;
          schema_id: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          checked_at?: string | null;
          created_at?: string | null;
          evidence_json?: Json | null;
          facts_json?: Json | null;
          id?: string | null;
          item_id?: string | null;
          quality_json?: Json | null;
          schema_id?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          checked_at?: string | null;
          created_at?: string | null;
          evidence_json?: Json | null;
          facts_json?: Json | null;
          id?: string | null;
          item_id?: string | null;
          quality_json?: Json | null;
          schema_id?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_fact_packs_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
        ];
      };
      tools: {
        Row: {
          avg_score: number | null;
          base_score: number | null;
          base_score_breakdown: Json | null;
          category_id: string | null;
          confirmed_correction_count: number | null;
          correction_count: number | null;
          created_at: string | null;
          data_confidence: number | null;
          embedding: string | null;
          embedding_model: string | null;
          embedding_version: string | null;
          id: string | null;
          is_featured: boolean | null;
          is_verified: boolean | null;
          last_major_update: string | null;
          last_user_verified_at: string | null;
          learning_curve: Database['public']['Enums']['learning_curve'] | null;
          logo_path: string | null;
          logo_url: string | null;
          long_description: string | null;
          metadata: Json | null;
          name: string | null;
          parent_id: string | null;
          pricing_confidence: string | null;
          pricing_type: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at: string | null;
          quality_review_completed_at: string | null;
          quality_review_flagged_at: string | null;
          quality_review_needed: boolean | null;
          quality_review_reason: string | null;
          quality_review_result: string | null;
          review_context: Json | null;
          review_count: number | null;
          short_description: string | null;
          slug: string | null;
          specs: Json | null;
          target_market: string | null;
          type: Database['public']['Enums']['item_type'] | null;
          updated_at: string | null;
          user_verifications_this_week: number | null;
          verdict: string | null;
          video_id: string | null;
          video_title: string | null;
          website: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tool_category_links_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      tools_needing_affiliates: {
        Row: {
          avg_score: number | null;
          category_name: string | null;
          current_url: string | null;
          id: string | null;
          is_affiliate: boolean | null;
          name: string | null;
          review_count: number | null;
          slug: string | null;
          website: string | null;
        };
        Relationships: [];
      };
      tools_with_tags: {
        Row: {
          audience_tags: Json | null;
          avg_score: number | null;
          base_score: number | null;
          base_score_breakdown: Json | null;
          category_id: string | null;
          confirmed_correction_count: number | null;
          correction_count: number | null;
          created_at: string | null;
          data_confidence: number | null;
          embedding: string | null;
          embedding_model: string | null;
          embedding_version: string | null;
          function_tags: Json | null;
          id: string | null;
          is_featured: boolean | null;
          is_verified: boolean | null;
          last_major_update: string | null;
          last_user_verified_at: string | null;
          learning_curve: Database['public']['Enums']['learning_curve'] | null;
          logo_path: string | null;
          logo_url: string | null;
          long_description: string | null;
          metadata: Json | null;
          name: string | null;
          parent_id: string | null;
          platform_tags: Json | null;
          pricing_confidence: string | null;
          pricing_type: Database['public']['Enums']['pricing_model'] | null;
          pricing_verified_at: string | null;
          quality_review_completed_at: string | null;
          quality_review_flagged_at: string | null;
          quality_review_needed: boolean | null;
          quality_review_reason: string | null;
          quality_review_result: string | null;
          review_context: Json | null;
          review_count: number | null;
          short_description: string | null;
          slug: string | null;
          specs: Json | null;
          target_market: string | null;
          type: Database['public']['Enums']['item_type'] | null;
          updated_at: string | null;
          user_verifications_this_week: number | null;
          verdict: string | null;
          video_id: string | null;
          video_title: string | null;
          website: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'freelancer_friendly_tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_audit';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_refresh_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'quality_review_queue';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_needing_affiliates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'tools_with_tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tool_category_links_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      analyze_content_ideas: {
        Args: { p_batch_id?: string; p_limit?: number };
        Returns: {
          duplicate_reason: string;
          id: string;
          is_duplicate: boolean;
          keyword: string;
          recommendation: string;
          roi_score: number;
          tool_name: string;
        }[];
      };
      approve_content_idea: {
        Args: { p_approved_by: string; p_idea_id: string; p_priority?: number };
        Returns: string;
      };
      build_context_title: {
        Args: {
          p_modifier?: string;
          p_noun: string;
          p_template: Database['public']['Enums']['title_template'];
        };
        Returns: string;
      };
      bulk_approve_ideas: {
        Args: {
          p_approved_by?: string;
          p_max_count?: number;
          p_min_roi?: number;
        };
        Returns: {
          approved_count: number;
          queue_ids: string[];
        }[];
      };
      calculate_keyword_priority: {
        Args: {
          p_cpc: number;
          p_difficulty: number;
          p_keyword_type?: Database['public']['Enums']['keyword_type'];
          p_volume: number;
        };
        Returns: number;
      };
      calculate_roi_score: {
        Args: { p_cpc: number; p_difficulty: number; p_volume: number };
        Returns: number;
      };
      calculate_sso_tax: {
        Args: { p_item_id: string };
        Returns: {
          base_plan_name: string;
          base_price_monthly: number;
          sso_plan_name: string;
          sso_price_monthly: number;
          sso_tax_pct: number;
        }[];
      };
      check_hard_duplicate: { Args: { p_tool_name: string }; Returns: Json };
      check_rate_limit: {
        Args: {
          p_endpoint: string;
          p_identifier: string;
          p_max_requests?: number;
          p_window_seconds?: number;
        };
        Returns: Json;
      };
      check_semantic_duplicate: {
        Args: { p_embedding: string; p_threshold?: number };
        Returns: Json;
      };
      claim_hunt_queue_item: {
        Args: { p_worker_id: string };
        Returns: {
          category_slug: string;
          context_id: string;
          context_title: string;
          force_regenerate: boolean;
          hunt_type: string;
          id: string;
          is_discovery_hunt: boolean;
          priority: number;
          research_dossier: Json;
          status: string;
          tool_name: string;
        }[];
      };
      cleanup_admin_sessions: { Args: never; Returns: number };
      cleanup_rate_limits: { Args: never; Returns: number };
      clear_hunt_checkpoint: {
        Args: { p_queue_id: string };
        Returns: undefined;
      };
      complete_hunt: {
        Args: {
          p_context_id?: string;
          p_item_id: string;
          p_queue_id: string;
          p_review_id?: string;
          p_tokens_used?: number;
        };
        Returns: undefined;
      };
      complete_import_batch: {
        Args: { p_batch_id: string; p_status?: string };
        Returns: undefined;
      };
      complete_quality_review: {
        Args: { p_notes?: string; p_result: string; p_tool_id: string };
        Returns: undefined;
      };
      create_admin_session: {
        Args: {
          p_expires_in_days?: number;
          p_ip_address?: string;
          p_token_hash: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      create_idea_from_competitor: {
        Args: { p_competitor_page_id: string };
        Returns: string;
      };
      create_import_batch: {
        Args: {
          p_created_by?: string;
          p_filename: string;
          p_total_rows: number;
        };
        Returns: string;
      };
      enqueue_pricing_refresh: {
        Args: { p_days_stale?: number; p_limit?: number; p_priority?: number };
        Returns: number;
      };
      fail_hunt: {
        Args: {
          p_dlq_reason?: string;
          p_error: string;
          p_error_details?: Json;
          p_queue_id: string;
        };
        Returns: undefined;
      };
      find_duplicate_item: {
        Args: {
          p_similarity_threshold?: number;
          p_tool_name: string;
          p_website_url?: string;
        };
        Returns: {
          id: string;
          name: string;
          similarity_score: number;
          website: string;
        }[];
      };
      find_similar_context: {
        Args: { p_context_title: string; p_threshold?: number };
        Returns: {
          id: string;
          similarity: number;
          title: string;
        }[];
      };
      flag_low_vote_tools: { Args: never; Returns: number };
      get_comparison_plan: { Args: { p_item_id: string }; Returns: Json };
      get_hunt_queue_stats: { Args: never; Returns: Json };
      get_items_by_department: {
        Args: { p_department_slug: string; p_limit?: number };
        Returns: {
          base_score: number;
          item_id: string;
          item_name: string;
          item_slug: string;
          pricing_type: string;
          relevance_score: number;
        }[];
      };
      get_or_create_category: {
        Args: {
          p_description?: string;
          p_name: string;
          p_type: Database['public']['Enums']['category_type'];
        };
        Returns: string;
      };
      get_or_create_comparison: {
        Args: { p_slug_1: string; p_slug_2: string };
        Returns: {
          choose_a_if: string[] | null;
          choose_b_if: string[] | null;
          created_at: string | null;
          curated_at: string | null;
          curator_notes: string | null;
          data_sources: string[] | null;
          generated_at: string | null;
          id: string;
          is_curated: boolean | null;
          item_a_id: string | null;
          item_a_slug: string;
          item_b_id: string | null;
          item_b_slug: string;
          migration_notes_a_to_b: string | null;
          migration_notes_b_to_a: string | null;
          substitutability_score: number | null;
          updated_at: string | null;
          verdict: string | null;
          why_switch_a_to_b: string[] | null;
          why_switch_b_to_a: string[] | null;
          winner_by_context: Json | null;
        };
        SetofOptions: {
          from: '*';
          to: 'comparison_insights';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_per_seat_price_monthly: {
        Args: { p_item_id: string };
        Returns: number;
      };
      get_priority_affiliate: {
        Args: { p_tool_id: string };
        Returns: {
          cta_text: string;
          is_affiliate: boolean;
          network: string;
          offer_id: string;
          url: string;
        }[];
      };
      get_prompt: {
        Args: { p_key: string };
        Returns: {
          template: string;
          variables: Json;
        }[];
      };
      get_quality_metrics: {
        Args: { p_days?: number };
        Returns: {
          avg_qa_score: number;
          human_review_rate: number;
          publish_rate: number;
          total_hunts: number;
        }[];
      };
      get_stale_research_items: {
        Args: { days_threshold?: number };
        Returns: {
          detected_category: string;
          id: string;
          research_completed_at: string;
          tool_name: string;
        }[];
      };
      get_starting_price_annual: {
        Args: { p_item_id: string };
        Returns: number;
      };
      get_starting_price_monthly: {
        Args: { p_item_id: string };
        Returns: number;
      };
      get_synthesis_ready_groups: {
        Args: { threshold?: number };
        Returns: {
          category: string;
          tool_count: number;
          tool_ids: string[];
          tool_names: string[];
        }[];
      };
      get_tools_needing_quality_review: {
        Args: { p_limit?: number };
        Returns: {
          confirmed_corrections: number;
          correction_count: number;
          days_since_flagged: number;
          flagged_at: string;
          review_reason: string;
          tool_id: string;
          tool_name: string;
          tool_slug: string;
        }[];
      };
      get_verification_stats: { Args: never; Returns: Json };
      heartbeat_hunt: { Args: { p_queue_id: string }; Returns: undefined };
      import_ahrefs_keywords: {
        Args: {
          p_apply_filters?: boolean;
          p_batch_id: string;
          p_keywords: Json;
        };
        Returns: {
          duplicates: number;
          filtered: number;
          imported: number;
        }[];
      };
      import_competitor_pages: {
        Args: { p_batch_id: string; p_competitor_domain: string; p_pages: Json };
        Returns: {
          competitor_id: string;
          imported: number;
          updated: number;
        }[];
      };
      link_item_to_categories: {
        Args: {
          p_audiences?: string[];
          p_functions?: string[];
          p_item_id: string;
          p_platforms?: string[];
        };
        Returns: undefined;
      };
      link_tool_to_category: {
        Args: {
          p_category_name: string;
          p_category_type: Database['public']['Enums']['category_type'];
          p_relevance?: number;
          p_tool_id: string;
        };
        Returns: string;
      };
      log_click: {
        Args: {
          p_country_code?: string;
          p_ip_hash?: string;
          p_offer_id: string;
          p_referrer?: string;
          p_source_context_id?: string;
          p_source_page?: string;
          p_tool_id: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      log_metric: {
        Args: { p_metric_type: string; p_metric_value: number; p_tags?: Json };
        Returns: string;
      };
      mark_hunt_defunct: {
        Args: {
          p_defunct_status: Json;
          p_queue_id: string;
          p_tokens_used?: number;
        };
        Returns: undefined;
      };
      match_items: {
        Args: {
          exclude_item_id?: string;
          filter_category?: string;
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          base_score: number;
          id: string;
          name: string;
          pricing_model: string;
          similarity: number;
          slug: string;
          sub_category: string;
        }[];
      };
      match_items_v2: {
        Args: {
          exclude_item_id?: string;
          filter_category?: string;
          filter_sub_category?: string;
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          base_score: number;
          id: string;
          name: string;
          pricing_model: string;
          similarity: number;
          slug: string;
          sub_category: string;
        }[];
      };
      match_tools: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          id: string;
          logo_url: string;
          name: string;
          short_description: string;
          similarity: number;
          slug: string;
        }[];
      };
      normalize_hunt_category_slug: {
        Args: { p_slug: string };
        Returns: string;
      };
      normalize_item_name: { Args: { p_name: string }; Returns: string };
      publish_review: {
        Args: { p_notes?: string; p_review_id: string; p_reviewer_id?: string };
        Returns: undefined;
      };
      record_price_verification: {
        Args: {
          p_ip_hash: string;
          p_is_accurate: boolean;
          p_item_id: string;
          p_item_name: string;
        };
        Returns: Json;
      };
      record_signal: {
        Args: {
          p_fingerprint_hash?: string;
          p_ip_hash?: string;
          p_item_id: string;
          p_option_key?: string;
          p_signal_key: string;
          p_source_page?: string;
          p_user_agent?: string;
          p_value_bool?: boolean;
          p_value_num?: number;
          p_value_text?: string;
        };
        Returns: Json;
      };
      recover_stale_hunt_jobs: { Args: never; Returns: number };
      reject_review: {
        Args: { p_reason?: string; p_review_id: string; p_reviewer_id?: string };
        Returns: undefined;
      };
      release_stale_hunt_claims: {
        Args: { p_stale_minutes?: number };
        Returns: number;
      };
      reset_weekly_verifications: { Args: never; Returns: undefined };
      revoke_admin_session: { Args: { p_token_hash: string }; Returns: boolean };
      save_hunt_checkpoint: {
        Args: {
          p_checkpoint: Json;
          p_expected_version?: number;
          p_phase: number;
          p_queue_id: string;
        };
        Returns: boolean;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      start_hunt: { Args: { p_queue_id: string }; Returns: undefined };
      text_to_priority: { Args: { p_text: string }; Returns: number };
      unset_signal: {
        Args: {
          p_fingerprint_hash?: string;
          p_ip_hash?: string;
          p_item_id: string;
          p_signal_key: string;
        };
        Returns: Json;
      };
      update_context_metrics: {
        Args: { p_context_id: string };
        Returns: undefined;
      };
      update_keyword_classification: {
        Args: {
          p_ai_response?: Json;
          p_context_query?: string;
          p_extracted_tools: Json;
          p_idea_id: string;
          p_keyword_type: Database['public']['Enums']['keyword_type'];
          p_tool_name?: string;
        };
        Returns: undefined;
      };
      update_tool_metrics: { Args: { p_tool_id: string }; Returns: undefined };
      validate_admin_session: { Args: { p_token_hash: string }; Returns: Json };
    };
    Enums: {
      category_pillar: 'builder' | 'creative' | 'growth' | 'operations';
      category_type: 'function' | 'audience' | 'platform' | 'department';
      content_status: 'draft' | 'review' | 'published' | 'rejected';
      hunt_queue_status:
        | 'pending'
        | 'claimed'
        | 'processing'
        | 'research_complete'
        | 'defunct'
        | 'completed'
        | 'failed';
      hunt_status: 'pending' | 'processing' | 'completed' | 'failed';
      item_type: 'tool' | 'gear';
      keyword_type:
        | 'best_list'
        | 'comparison'
        | 'alternatives'
        | 'single_tool'
        | 'informational'
        | 'skip';
      learning_curve: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
      pricing_model: 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source';
      queue_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
      title_template: 'best' | 'top_10' | 'alternatives' | 'vs' | 'free' | 'open_source';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      category_pillar: ['builder', 'creative', 'growth', 'operations'],
      category_type: ['function', 'audience', 'platform', 'department'],
      content_status: ['draft', 'review', 'published', 'rejected'],
      hunt_queue_status: [
        'pending',
        'claimed',
        'processing',
        'research_complete',
        'defunct',
        'completed',
        'failed',
      ],
      hunt_status: ['pending', 'processing', 'completed', 'failed'],
      item_type: ['tool', 'gear'],
      keyword_type: [
        'best_list',
        'comparison',
        'alternatives',
        'single_tool',
        'informational',
        'skip',
      ],
      learning_curve: ['minutes', 'hours', 'days', 'weeks', 'months'],
      pricing_model: ['free', 'freemium', 'paid', 'enterprise', 'open_source'],
      queue_status: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      title_template: ['best', 'top_10', 'alternatives', 'vs', 'free', 'open_source'],
    },
  },
} as const;
