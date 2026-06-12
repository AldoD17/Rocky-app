export const FORMATS = [
  { label: "Ristorante tradizionale", value: "ristorante_tradizionale" },
  { label: "Trattoria",               value: "trattoria"               },
  { label: "Osteria",                 value: "osteria"                 },
  { label: "Pizzeria",                value: "pizzeria"                },
  { label: "Hamburgeria",             value: "hamburgeria"             },
  { label: "Steakhouse",              value: "steakhouse"              },
  { label: "Ristorante etnico",       value: "ristorante_etnico"       },
  { label: "Sushi bar",               value: "sushi_bar"               },
  { label: "Bistrot",                 value: "bistrot"                 },
  { label: "Brasserie",               value: "brasserie"               },
  { label: "Pub",                     value: "pub"                     },
  { label: "Wine bar",                value: "wine_bar"                },
  { label: "Cocktail bar",            value: "cocktail_bar"            },
  { label: "Caffetteria",             value: "caffetteria"             },
  { label: "Gelateria",               value: "gelateria"               },
  { label: "Pasticceria",             value: "pasticceria"             },
  { label: "Bakery",                  value: "bakery"                  },
  { label: "Street food",             value: "street_food"             },
  { label: "Catering e banqueting",   value: "catering_banqueting"     },
] as const;

export const CONTRACT_OPTIONS = [
  { label: "Full-time",   value: "full_time"   },
  { label: "Part-time",   value: "part_time"   },
  { label: "Apprendista", value: "apprendista" },
  { label: "A chiamata",  value: "a_chiamata"  },
] as const;

export const FIXED_COST_CATEGORIES = [
  { value: "affitto",                 label: "Affitto"                     },
  { value: "utenze",                  label: "Utenze"                      },
  { value: "assicurazioni_siae_tari", label: "Assicurazioni · SIAE · TARI" },
  { value: "commercialista",          label: "Commercialista"              },
  { value: "leasing_finanziamenti",   label: "Leasing / finanz."           },
  { value: "altro",                   label: "Altro"                       },
] as const;

export const FREQUENCY_OPTIONS = ["mensile", "bimestrale", "trimestrale", "semestrale", "annuale"] as const;
