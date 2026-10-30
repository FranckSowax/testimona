// Généré depuis la base de production Supabase (projet « Testimona app ») le 2026-10-28.
// Ne pas modifier à la main : relancer `pnpm --filter @testimona/supabase db:types`
// (ou l'outil generate_typescript_types du MCP Supabase) après chaque migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      AdSpace: {
        Row: {
          createdAt: string
          expiresAt: string | null
          html: string | null
          id: string
          imageUrl: string | null
          isActive: boolean
          name: string
          slot: string
          startsAt: string | null
          targetUrl: string | null
          type: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          expiresAt?: string | null
          html?: string | null
          id?: string
          imageUrl?: string | null
          isActive?: boolean
          name: string
          slot: string
          startsAt?: string | null
          targetUrl?: string | null
          type?: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string | null
          html?: string | null
          id?: string
          imageUrl?: string | null
          isActive?: boolean
          name?: string
          slot?: string
          startsAt?: string | null
          targetUrl?: string | null
          type?: string
          updatedAt?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          count: number
          day: string
          dossier_id: string
        }
        Insert: {
          count?: number
          day: string
          dossier_id: string
        }
        Update: {
          count?: number
          day?: string
          dossier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      Biography: {
        Row: {
          createdAt: string
          education: string | null
          hobby: string | null
          homeCity: string | null
          id: string
          memorialId: string
          placesLived: string | null
          relatives: string | null
          religion: string | null
          socialLinks: string | null
          username: string | null
          work: string | null
        }
        Insert: {
          createdAt?: string
          education?: string | null
          hobby?: string | null
          homeCity?: string | null
          id?: string
          memorialId: string
          placesLived?: string | null
          relatives?: string | null
          religion?: string | null
          socialLinks?: string | null
          username?: string | null
          work?: string | null
        }
        Update: {
          createdAt?: string
          education?: string | null
          hobby?: string | null
          homeCity?: string | null
          id?: string
          memorialId?: string
          placesLived?: string | null
          relatives?: string | null
          religion?: string | null
          socialLinks?: string | null
          username?: string | null
          work?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Biography_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line: {
        Row: {
          amount_full: number
          amount_intermediate: number
          amount_sober: number
          created_at: string
          dossier_id: string
          edited: boolean
          grid_key: string | null
          id: string
          label: string
          position: number
          updated_at: string
        }
        Insert: {
          amount_full?: number
          amount_intermediate?: number
          amount_sober?: number
          created_at?: string
          dossier_id: string
          edited?: boolean
          grid_key?: string | null
          id?: string
          label: string
          position?: number
          updated_at?: string
        }
        Update: {
          amount_full?: number
          amount_intermediate?: number
          amount_sober?: number
          created_at?: string
          dossier_id?: string
          edited?: boolean
          grid_key?: string | null
          id?: string
          label?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      Chapter: {
        Row: {
          biographyId: string
          content: string
          createdAt: string
          id: string
          media: Json
          position: number
          title: string
        }
        Insert: {
          biographyId: string
          content: string
          createdAt?: string
          id?: string
          media?: Json
          position?: number
          title: string
        }
        Update: {
          biographyId?: string
          content?: string
          createdAt?: string
          id?: string
          media?: Json
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "Chapter_biographyId_fkey"
            columns: ["biographyId"]
            isOneToOne: false
            referencedRelation: "Biography"
            referencedColumns: ["id"]
          },
        ]
      }
      CreditTransaction: {
        Row: {
          amount: number
          createdAt: string
          id: string
          memorialClipId: string | null
          note: string | null
          stripePaymentId: string | null
          type: string
          userId: string
        }
        Insert: {
          amount: number
          createdAt?: string
          id?: string
          memorialClipId?: string | null
          note?: string | null
          stripePaymentId?: string | null
          type: string
          userId: string
        }
        Update: {
          amount?: number
          createdAt?: string
          id?: string
          memorialClipId?: string | null
          note?: string | null
          stripePaymentId?: string | null
          type?: string
          userId?: string
        }
        Relationships: []
      }
      Donation: {
        Row: {
          amount: number
          createdAt: string
          currency: string
          donorEmail: string | null
          donorId: string | null
          donorName: string | null
          id: string
          isAnonymous: boolean
          memorialId: string
          message: string | null
          status: string
          stripeSessionId: string | null
        }
        Insert: {
          amount: number
          createdAt?: string
          currency?: string
          donorEmail?: string | null
          donorId?: string | null
          donorName?: string | null
          id?: string
          isAnonymous?: boolean
          memorialId: string
          message?: string | null
          status?: string
          stripeSessionId?: string | null
        }
        Update: {
          amount?: number
          createdAt?: string
          currency?: string
          donorEmail?: string | null
          donorId?: string | null
          donorName?: string | null
          id?: string
          isAnonymous?: boolean
          memorialId?: string
          message?: string | null
          status?: string
          stripeSessionId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Donation_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier: {
        Row: {
          city: string
          country_code: string
          created_at: string
          created_by: string
          entry_point: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          created_by?: string
          entry_point: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          created_by?: string
          entry_point?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dossier_finance: {
        Row: {
          amounts_visibility: string
          closed_at: string | null
          closed_by: string | null
          dossier_id: string
          scenario: string | null
          updated_at: string
        }
        Insert: {
          amounts_visibility?: string
          closed_at?: string | null
          closed_by?: string | null
          dossier_id: string
          scenario?: string | null
          updated_at?: string
        }
        Update: {
          amounts_visibility?: string
          closed_at?: string | null
          closed_by?: string | null
          dossier_id?: string
          scenario?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_finance_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_invitation: {
        Row: {
          created_at: string
          created_by: string
          dossier_id: string
          email: string | null
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["dossier_role"]
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          dossier_id: string
          email?: string | null
          expires_at?: string
          id?: string
          role: Database["public"]["Enums"]["dossier_role"]
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dossier_id?: string
          email?: string | null
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["dossier_role"]
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_invitation_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_member: {
        Row: {
          created_at: string
          display_name: string | null
          dossier_id: string
          role: Database["public"]["Enums"]["dossier_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          dossier_id: string
          role: Database["public"]["Enums"]["dossier_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          dossier_id?: string
          role?: Database["public"]["Enums"]["dossier_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_member_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      Funeral: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          memorialId: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id?: string
          memorialId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          memorialId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Funeral_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      FuneralEvent: {
        Row: {
          address: string | null
          createdAt: string
          date: string | null
          funeralId: string
          hour: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          note: string | null
          position: number
          title: string
          url: string | null
        }
        Insert: {
          address?: string | null
          createdAt?: string
          date?: string | null
          funeralId: string
          hour?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          position?: number
          title: string
          url?: string | null
        }
        Update: {
          address?: string | null
          createdAt?: string
          date?: string | null
          funeralId?: string
          hour?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          position?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "FuneralEvent_funeralId_fkey"
            columns: ["funeralId"]
            isOneToOne: false
            referencedRelation: "Funeral"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_answer: {
        Row: {
          answered_by: string | null
          dossier_id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          answered_by?: string | null
          dossier_id: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          answered_by?: string | null
          dossier_id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "journey_answer_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_closure_event: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          dossier_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          dossier_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          dossier_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_closure_event_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entry: {
        Row: {
          amount: number
          budget_line_id: string | null
          created_at: string
          created_by: string | null
          dossier_id: string
          id: string
          idempotency_key: string
          kind: string
          member_id: string | null
          method: string | null
          note: string
          occurred_on: string
          party_name: string
          pledge_id: string | null
          reverses_id: string | null
          reverses_kind: string | null
        }
        Insert: {
          amount: number
          budget_line_id?: string | null
          created_at?: string
          created_by?: string | null
          dossier_id: string
          id?: string
          idempotency_key: string
          kind: string
          member_id?: string | null
          method?: string | null
          note?: string
          occurred_on?: string
          party_name: string
          pledge_id?: string | null
          reverses_id?: string | null
          reverses_kind?: string | null
        }
        Update: {
          amount?: number
          budget_line_id?: string | null
          created_at?: string
          created_by?: string | null
          dossier_id?: string
          id?: string
          idempotency_key?: string
          kind?: string
          member_id?: string | null
          method?: string | null
          note?: string
          occurred_on?: string
          party_name?: string
          pledge_id?: string | null
          reverses_id?: string | null
          reverses_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entry_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_line"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entry_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entry_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "ledger_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entry_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: true
            referencedRelation: "ledger_entry"
            referencedColumns: ["id"]
          },
        ]
      }
      Memorial: {
        Row: {
          birthCity: string | null
          birthCountry: string | null
          birthDate: string | null
          coverPhotoId: string | null
          coverUrl: string | null
          createdAt: string
          deathCity: string | null
          deathCountry: string | null
          deathDate: string | null
          description: string | null
          donationAbout: string | null
          donationCurrency: string | null
          donationGoalCents: number
          firstname: string
          id: string
          isPublic: boolean
          language: string
          lastname: string
          musicUrl: string | null
          nickname: string | null
          ownerId: string
          portraitUrl: string | null
          relationship: string | null
          slug: string
          updatedAt: string
        }
        Insert: {
          birthCity?: string | null
          birthCountry?: string | null
          birthDate?: string | null
          coverPhotoId?: string | null
          coverUrl?: string | null
          createdAt?: string
          deathCity?: string | null
          deathCountry?: string | null
          deathDate?: string | null
          description?: string | null
          donationAbout?: string | null
          donationCurrency?: string | null
          donationGoalCents?: number
          firstname: string
          id?: string
          isPublic?: boolean
          language?: string
          lastname: string
          musicUrl?: string | null
          nickname?: string | null
          ownerId: string
          portraitUrl?: string | null
          relationship?: string | null
          slug: string
          updatedAt?: string
        }
        Update: {
          birthCity?: string | null
          birthCountry?: string | null
          birthDate?: string | null
          coverPhotoId?: string | null
          coverUrl?: string | null
          createdAt?: string
          deathCity?: string | null
          deathCountry?: string | null
          deathDate?: string | null
          description?: string | null
          donationAbout?: string | null
          donationCurrency?: string | null
          donationGoalCents?: number
          firstname?: string
          id?: string
          isPublic?: boolean
          language?: string
          lastname?: string
          musicUrl?: string | null
          nickname?: string | null
          ownerId?: string
          portraitUrl?: string | null
          relationship?: string | null
          slug?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Memorial_coverPhotoId_fkey"
            columns: ["coverPhotoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialAdminRequest: {
        Row: {
          createdAt: string
          id: string
          memorialId: string
          note: string | null
          relationship: string
          status: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          memorialId: string
          note?: string | null
          relationship: string
          status?: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          memorialId?: string
          note?: string | null
          relationship?: string
          status?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MemorialAdminRequest_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialClip: {
        Row: {
          caption: string | null
          captionSource: string | null
          createdAt: string
          createdById: string
          creditCost: number
          durationMs: number
          errorMessage: string | null
          higgsfieldJobId: string | null
          id: string
          memorialId: string
          photoId: string
          providerCreditCost: number | null
          status: string
          testimonialId: string | null
          updatedAt: string
          validatedAt: string | null
          videoUrl: string | null
        }
        Insert: {
          caption?: string | null
          captionSource?: string | null
          createdAt?: string
          createdById: string
          creditCost?: number
          durationMs?: number
          errorMessage?: string | null
          higgsfieldJobId?: string | null
          id?: string
          memorialId: string
          photoId: string
          providerCreditCost?: number | null
          status?: string
          testimonialId?: string | null
          updatedAt?: string
          validatedAt?: string | null
          videoUrl?: string | null
        }
        Update: {
          caption?: string | null
          captionSource?: string | null
          createdAt?: string
          createdById?: string
          creditCost?: number
          durationMs?: number
          errorMessage?: string | null
          higgsfieldJobId?: string | null
          id?: string
          memorialId?: string
          photoId?: string
          providerCreditCost?: number | null
          status?: string
          testimonialId?: string | null
          updatedAt?: string
          validatedAt?: string | null
          videoUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MemorialClip_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MemorialClip_photoId_fkey"
            columns: ["photoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MemorialClip_testimonialId_fkey"
            columns: ["testimonialId"]
            isOneToOne: false
            referencedRelation: "Testimonial"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialFavorite: {
        Row: {
          createdAt: string
          id: string
          memorialId: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          memorialId: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          memorialId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MemorialFavorite_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialMember: {
        Row: {
          createdAt: string
          id: string
          invitedById: string | null
          invitedEmail: string | null
          memorialId: string
          role: string
          status: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          createdAt?: string
          id?: string
          invitedById?: string | null
          invitedEmail?: string | null
          memorialId: string
          role?: string
          status?: string
          updatedAt?: string
          userId?: string | null
        }
        Update: {
          createdAt?: string
          id?: string
          invitedById?: string | null
          invitedEmail?: string | null
          memorialId?: string
          role?: string
          status?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MemorialMember_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialShopItem: {
        Row: {
          createdAt: string
          fundedCents: number
          id: string
          memorialId: string
          mockupErrorMessage: string | null
          mockupImageUrl: string | null
          mockupJobId: string | null
          mockupStatus: string
          notes: string | null
          position: number
          productId: string
          targetQuantity: number
          unitPriceCents: number
          updatedAt: string
          visualId: string | null
        }
        Insert: {
          createdAt?: string
          fundedCents?: number
          id?: string
          memorialId: string
          mockupErrorMessage?: string | null
          mockupImageUrl?: string | null
          mockupJobId?: string | null
          mockupStatus?: string
          notes?: string | null
          position?: number
          productId: string
          targetQuantity: number
          unitPriceCents: number
          updatedAt?: string
          visualId?: string | null
        }
        Update: {
          createdAt?: string
          fundedCents?: number
          id?: string
          memorialId?: string
          mockupErrorMessage?: string | null
          mockupImageUrl?: string | null
          mockupJobId?: string | null
          mockupStatus?: string
          notes?: string | null
          position?: number
          productId?: string
          targetQuantity?: number
          unitPriceCents?: number
          updatedAt?: string
          visualId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MemorialShopItem_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MemorialShopItem_visualId_fkey"
            columns: ["visualId"]
            isOneToOne: false
            referencedRelation: "MemorialVisual"
            referencedColumns: ["id"]
          },
        ]
      }
      MemorialVisual: {
        Row: {
          createdAt: string
          createdById: string
          errorMessage: string | null
          id: string
          imageUrl: string | null
          memorialId: string
          prompt: string | null
          providerJobId: string | null
          sourcePhotoId: string | null
          status: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          createdById: string
          errorMessage?: string | null
          id?: string
          imageUrl?: string | null
          memorialId: string
          prompt?: string | null
          providerJobId?: string | null
          sourcePhotoId?: string | null
          status?: string
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          createdById?: string
          errorMessage?: string | null
          id?: string
          imageUrl?: string | null
          memorialId?: string
          prompt?: string | null
          providerJobId?: string | null
          sourcePhotoId?: string | null
          status?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "MemorialVisual_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MemorialVisual_sourcePhotoId_fkey"
            columns: ["sourcePhotoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
        ]
      }
      person: {
        Row: {
          birth_date: string | null
          created_at: string
          death_city: string | null
          death_country_code: string | null
          death_date: string | null
          dossier_id: string
          first_name: string
          last_name: string
          nickname: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          death_city?: string | null
          death_country_code?: string | null
          death_date?: string | null
          dossier_id: string
          first_name: string
          last_name: string
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          death_city?: string | null
          death_country_code?: string | null
          death_date?: string | null
          dossier_id?: string
          first_name?: string
          last_name?: string
          nickname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
        ]
      }
      Photo: {
        Row: {
          caption: string | null
          createdAt: string
          durationMs: number | null
          id: string
          memorialId: string
          moderatedAt: string | null
          moderatedById: string | null
          position: number
          status: string
          submittedByEmail: string | null
          submittedById: string | null
          submittedByName: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          createdAt?: string
          durationMs?: number | null
          id?: string
          memorialId: string
          moderatedAt?: string | null
          moderatedById?: string | null
          position?: number
          status?: string
          submittedByEmail?: string | null
          submittedById?: string | null
          submittedByName?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          createdAt?: string
          durationMs?: number | null
          id?: string
          memorialId?: string
          moderatedAt?: string | null
          moderatedById?: string | null
          position?: number
          status?: string
          submittedByEmail?: string | null
          submittedById?: string | null
          submittedByName?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "Photo_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      PhotoComment: {
        Row: {
          authorId: string
          authorName: string
          createdAt: string
          id: string
          message: string
          photoId: string
        }
        Insert: {
          authorId: string
          authorName: string
          createdAt?: string
          id?: string
          message: string
          photoId: string
        }
        Update: {
          authorId?: string
          authorName?: string
          createdAt?: string
          id?: string
          message?: string
          photoId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PhotoComment_photoId_fkey"
            columns: ["photoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
        ]
      }
      PhotoLike: {
        Row: {
          createdAt: string
          id: string
          photoId: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          photoId: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          photoId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PhotoLike_photoId_fkey"
            columns: ["photoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
        ]
      }
      PhotoReport: {
        Row: {
          createdAt: string
          id: string
          photoId: string
          reason: string
          reporterId: string | null
          status: string
        }
        Insert: {
          createdAt?: string
          id?: string
          photoId: string
          reason: string
          reporterId?: string | null
          status?: string
        }
        Update: {
          createdAt?: string
          id?: string
          photoId?: string
          reason?: string
          reporterId?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "PhotoReport_photoId_fkey"
            columns: ["photoId"]
            isOneToOne: false
            referencedRelation: "Photo"
            referencedColumns: ["id"]
          },
        ]
      }
      provider: {
        Row: {
          active: boolean
          category_key: string
          city: string
          created_at: string
          district: string | null
          id: string
          is_example: boolean
          name: string
          price_note: string | null
          updated_at: string
          verified_at: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          category_key: string
          city: string
          created_at?: string
          district?: string | null
          id?: string
          is_example?: boolean
          name: string
          price_note?: string | null
          updated_at?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          category_key?: string
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          is_example?: boolean
          name?: string
          price_note?: string | null
          updated_at?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "provider_category"
            referencedColumns: ["key"]
          },
        ]
      }
      provider_category: {
        Row: {
          key: string
          position: number
        }
        Insert: {
          key: string
          position: number
        }
        Update: {
          key?: string
          position?: number
        }
        Relationships: []
      }
      quote_request: {
        Row: {
          created_at: string
          created_by: string | null
          dossier_id: string
          id: string
          message: string
          provider_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dossier_id: string
          id?: string
          message: string
          provider_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dossier_id?: string
          id?: string
          message?: string
          provider_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt: {
        Row: {
          created_at: string
          created_by: string | null
          dossier_id: string
          entry_id: string | null
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dossier_id: string
          entry_id?: string | null
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dossier_id?: string
          entry_id?: string | null
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "ledger_entry"
            referencedColumns: ["id"]
          },
        ]
      }
      ShopContribution: {
        Row: {
          amountCents: number
          createdAt: string
          donorEmail: string | null
          donorId: string | null
          donorName: string | null
          id: string
          isAnonymous: boolean
          message: string | null
          shopItemId: string
          status: string
          stripeSessionId: string | null
          wantsItem: boolean
        }
        Insert: {
          amountCents: number
          createdAt?: string
          donorEmail?: string | null
          donorId?: string | null
          donorName?: string | null
          id?: string
          isAnonymous?: boolean
          message?: string | null
          shopItemId: string
          status?: string
          stripeSessionId?: string | null
          wantsItem?: boolean
        }
        Update: {
          amountCents?: number
          createdAt?: string
          donorEmail?: string | null
          donorId?: string | null
          donorName?: string | null
          id?: string
          isAnonymous?: boolean
          message?: string | null
          shopItemId?: string
          status?: string
          stripeSessionId?: string | null
          wantsItem?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ShopContribution_shopItemId_fkey"
            columns: ["shopItemId"]
            isOneToOne: false
            referencedRelation: "MemorialShopItem"
            referencedColumns: ["id"]
          },
        ]
      }
      StudiaBalance: {
        Row: {
          balance: number
          id: number
          updatedAt: string
        }
        Insert: {
          balance?: number
          id?: number
          updatedAt?: string
        }
        Update: {
          balance?: number
          id?: number
          updatedAt?: string
        }
        Relationships: []
      }
      StudiaTransaction: {
        Row: {
          amount: number
          createdAt: string
          id: string
          memorialClipId: string | null
          note: string | null
          type: string
        }
        Insert: {
          amount: number
          createdAt?: string
          id?: string
          memorialClipId?: string | null
          note?: string | null
          type: string
        }
        Update: {
          amount?: number
          createdAt?: string
          id?: string
          memorialClipId?: string | null
          note?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudiaTransaction_memorialClipId_fkey"
            columns: ["memorialClipId"]
            isOneToOne: false
            referencedRelation: "MemorialClip"
            referencedColumns: ["id"]
          },
        ]
      }
      Testimonial: {
        Row: {
          authorEmail: string | null
          authorFirstname: string | null
          authorId: string | null
          authorName: string
          createdAt: string
          id: string
          language: string
          memorialId: string
          message: string
          moderatedAt: string | null
          moderatedById: string | null
          relationship: string | null
          status: string
        }
        Insert: {
          authorEmail?: string | null
          authorFirstname?: string | null
          authorId?: string | null
          authorName: string
          createdAt?: string
          id?: string
          language?: string
          memorialId: string
          message: string
          moderatedAt?: string | null
          moderatedById?: string | null
          relationship?: string | null
          status?: string
        }
        Update: {
          authorEmail?: string | null
          authorFirstname?: string | null
          authorId?: string | null
          authorName?: string
          createdAt?: string
          id?: string
          language?: string
          memorialId?: string
          message?: string
          moderatedAt?: string | null
          moderatedById?: string | null
          relationship?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "Testimonial_memorialId_fkey"
            columns: ["memorialId"]
            isOneToOne: false
            referencedRelation: "Memorial"
            referencedColumns: ["id"]
          },
        ]
      }
      TestimonialComment: {
        Row: {
          authorId: string
          authorName: string
          createdAt: string
          id: string
          message: string
          testimonialId: string
        }
        Insert: {
          authorId: string
          authorName: string
          createdAt?: string
          id?: string
          message: string
          testimonialId: string
        }
        Update: {
          authorId?: string
          authorName?: string
          createdAt?: string
          id?: string
          message?: string
          testimonialId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TestimonialComment_testimonialId_fkey"
            columns: ["testimonialId"]
            isOneToOne: false
            referencedRelation: "Testimonial"
            referencedColumns: ["id"]
          },
        ]
      }
      TestimonialLike: {
        Row: {
          createdAt: string
          testimonialId: string
          userId: string
        }
        Insert: {
          createdAt?: string
          testimonialId: string
          userId: string
        }
        Update: {
          createdAt?: string
          testimonialId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TestimonialLike_testimonialId_fkey"
            columns: ["testimonialId"]
            isOneToOne: false
            referencedRelation: "Testimonial"
            referencedColumns: ["id"]
          },
        ]
      }
      TestimonialReport: {
        Row: {
          createdAt: string
          id: string
          reason: string
          reporterId: string
          resolved: boolean
          testimonialId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          reason: string
          reporterId: string
          resolved?: boolean
          testimonialId: string
        }
        Update: {
          createdAt?: string
          id?: string
          reason?: string
          reporterId?: string
          resolved?: boolean
          testimonialId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TestimonialReport_testimonialId_fkey"
            columns: ["testimonialId"]
            isOneToOne: false
            referencedRelation: "Testimonial"
            referencedColumns: ["id"]
          },
        ]
      }
      UserCredit: {
        Row: {
          balance: number
          updatedAt: string
          userId: string
        }
        Insert: {
          balance?: number
          updatedAt?: string
          userId: string
        }
        Update: {
          balance?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_dossier_invitation: { Args: { p_token: string }; Returns: string }
      close_ledger: { Args: { p_dossier_id: string }; Returns: string }
      consume_ai_quota: {
        Args: { p_daily_limit?: number; p_dossier_id: string }
        Returns: boolean
      }
      create_dossier_with_person: {
        Args: {
          p_city: string
          p_country_code: string
          p_entry_point: string
          p_first_name: string
          p_last_name: string
          p_relationship: string
        }
        Returns: string
      }
      dossier_role_rank: {
        Args: { p_role: Database["public"]["Enums"]["dossier_role"] }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_dossier_member: {
        Args: {
          p_dossier_id: string
          p_min_role?: Database["public"]["Enums"]["dossier_role"]
        }
        Returns: boolean
      }
      ledger_assert_open: { Args: { p_dossier_id: string }; Returns: undefined }
      ledger_spent_by_line: {
        Args: { p_dossier_id: string }
        Returns: {
          budget_line_id: string
          spent: number
        }[]
      }
      ledger_totals: {
        Args: { p_dossier_id: string }
        Returns: {
          pledged_open: number
          received: number
          spent: number
        }[]
      }
      reopen_ledger: { Args: { p_dossier_id: string }; Returns: undefined }
      request_quote: {
        Args: {
          p_dossier_id: string
          p_message: string
          p_provider_id: string
          p_step_id: string
        }
        Returns: string
      }
      set_budget_scenario: {
        Args: { p_dossier_id: string; p_scenario: string }
        Returns: undefined
      }
    }
    Enums: {
      dossier_role:
        | "owner"
        | "coordinator"
        | "treasurer"
        | "contributor"
        | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dossier_role: [
        "owner",
        "coordinator",
        "treasurer",
        "contributor",
        "viewer",
      ],
    },
  },
} as const
