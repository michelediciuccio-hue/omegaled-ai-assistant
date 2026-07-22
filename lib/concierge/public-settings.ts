import { supabaseAdminFetch } from "@/lib/admin/supabase-admin";

export type PublicConciergeSettings = {
  display_name: string;
  headline: string;
  subheadline: string;
  welcome_message: string;
  input_placeholder: string;
  submit_label: string;
  quick_actions: string[];
  enabled: boolean;
};

const fallbackSettings: PublicConciergeSettings = {
  display_name: "OmegaBot",
  headline: "Concierge d’ingresso OmegaLed",
  subheadline:
    "Chiedi e ti indico il percorso migliore. Se hai bisogno di informazioni su un prodotto, chiedi pure.",
  welcome_message:
    "Benvenuto. Posso aiutarti a trovare informazioni sui prodotti OmegaLed oppure indirizzarti verso il personale più adatto.",
  input_placeholder: "Scrivi la tua richiesta…",
  submit_label: "Invia",
  quick_actions: [
    "Informazioni su un prodotto",
    "Assistenza tecnica",
    "Richiesta commerciale",
    "Trova il rivenditore più vicino",
  ],
  enabled: true,
};

export async function getPublicConciergeSettings(): Promise<PublicConciergeSettings> {
  try {
    const response = await supabaseAdminFetch(
      "/rest/v1/concierge_channel_settings?channel=eq.website&select=display_name,headline,subheadline,welcome_message,input_placeholder,submit_label,quick_actions,enabled&limit=1",
    );

    if (!response.ok) return fallbackSettings;

    const rows = (await response.json()) as PublicConciergeSettings[];
    const settings = rows[0];
    if (!settings) return fallbackSettings;

    return {
      ...fallbackSettings,
      ...settings,
      quick_actions: Array.isArray(settings.quick_actions)
        ? settings.quick_actions.filter((item): item is string => typeof item === "string")
        : fallbackSettings.quick_actions,
    };
  } catch (error) {
    console.error("Public concierge settings fallback", error);
    return fallbackSettings;
  }
}
