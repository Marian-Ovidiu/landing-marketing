"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./SegnaleFinalCta.module.css";

type FieldName = "email" | "name" | "venue" | "city";
type FormValues = Record<FieldName, string>;
type FormErrors = Partial<Record<FieldName, string>>;
type FormStatus =
  | { kind: "demo" | "duplicate" | "validation"; message: string }
  | null;

const initialValues: FormValues = {
  email: "",
  name: "",
  venue: "",
  city: "",
};

const fields: ReadonlyArray<{
  name: FieldName;
  label: string;
  type: "email" | "text";
  placeholder: string;
  help: string;
  autoComplete: string;
}> = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "nome@esempio.it",
    help: "La useremo per contattarti sui primi accessi.",
    autoComplete: "email",
  },
  {
    name: "name",
    label: "Nome",
    type: "text",
    placeholder: "Il tuo nome",
    help: "Per sapere come rivolgerci a te.",
    autoComplete: "name",
  },
  {
    name: "venue",
    label: "Nome del locale",
    type: "text",
    placeholder: "Es. Osteria da Rita",
    help: "Per associare la richiesta al tuo locale.",
    autoComplete: "organization",
  },
  {
    name: "city",
    label: "Città",
    type: "text",
    placeholder: "Es. Bologna",
    help: "Indica la città in cui si trova il locale.",
    autoComplete: "address-level2",
  },
];

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};
  if (!values.email.trim()) errors.email = "Inserisci il tuo indirizzo email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Inserisci un indirizzo email valido.";
  }
  if (!values.name.trim()) errors.name = "Inserisci il tuo nome.";
  if (!values.venue.trim()) errors.venue = "Inserisci il nome del locale.";
  if (!values.city.trim()) errors.city = "Inserisci la città del locale.";
  return errors;
};

export function SegnaleFinalCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const submittedEmailsRef = useRef(new Set<string>());
  const fieldRefs = useRef<Record<FieldName, HTMLInputElement | null>>({
    email: null,
    name: null,
    venue: null,
    city: null,
  });
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const primary = section.querySelector("[data-s04-primary]");
        const secondary = section.querySelector("[data-s04-secondary]");
        const microcopy = section.querySelector("[data-s04-microcopy]");
        const rule = section.querySelector("[data-s04-rule]");

        gsap.set(primary, { opacity: 0.72, y: 8 });
        gsap.set([secondary, microcopy], { opacity: 0.72 });
        gsap.set(rule, { scaleX: 0.55, transformOrigin: "left center" });

        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section,
              start: "top 95%",
              end: "top 60%",
              scrub: 0.12,
              invalidateOnRefresh: true,
            },
          })
          .to(primary, { opacity: 1, y: 0, duration: 1 }, 0)
          .to([secondary, microcopy], { opacity: 1, duration: 1 }, 0)
          .to(rule, { scaleX: 1, duration: 1 }, 0);
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const submitEarlyAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    const firstInvalid = fields.find(({ name }) => nextErrors[name]);
    if (firstInvalid) {
      setStatus({
        kind: "validation",
        message: "Controlla i campi indicati e riprova.",
      });
      fieldRefs.current[firstInvalid.name]?.focus();
      return;
    }

    setStatus(null);
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const normalizedEmail = values.email.trim().toLowerCase();
    if (submittedEmailsRef.current.has(normalizedEmail)) {
      setStatus({
        kind: "duplicate",
        message:
          "Modalità demo: questo indirizzo è già stato verificato in questa sessione. Nessun dato è stato inviato o salvato.",
      });
    } else {
      submittedEmailsRef.current.add(normalizedEmail);
      setStatus({
        kind: "demo",
        message:
          "Modalità demo: validazione completata. Nessun dato è stato inviato o salvato.",
      });
    }
    setLoading(false);
  };

  const backToExample = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("section-02-esempio-di-piano");
    const heading = document.getElementById("segnale-s02-title");
    if (!target || !heading) return;

    event.preventDefault();
    const hash = "#section-02-esempio-di-piano";
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);

    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <section
      id="section-04-cta-finale"
      className={styles.section}
      ref={sectionRef}
      aria-labelledby="segnale-s04-title"
    >
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p>EARLY ACCESS</p>
          <span data-s04-rule aria-hidden="true" />
        </div>

        <div className={styles.main}>
          <h2 id="segnale-s04-title">
            <span>Il tuo locale ha già abbastanza cose da gestire.</span>
            {" "}
            <span>La strategia può essere una in meno.</span>
          </h2>

          <p className={styles.subheadline}>
            Segnale è in sviluppo. Apriremo gradualmente i primi accessi a piccoli ristoranti, pizzerie, bar e locali indipendenti senza un team marketing interno.
          </p>
          <p className={styles.body}>
            I primi utenti potranno provare le funzioni essenziali e raccontarci cosa è davvero utile nella settimana reale. Lascia i tuoi dati: ti contatteremo quando apriremo i primi accessi.
          </p>

          <form className={styles.form} noValidate onSubmit={submitEarlyAccess}>
            <div className={styles.fields}>
              {fields.map((field) => {
                const helpId = `early-access-${field.name}-help`;
                const errorId = `early-access-${field.name}-error`;
                const inputId = `early-access-${field.name}`;
                return (
                  <div className={styles.field} key={field.name}>
                    <label htmlFor={inputId}>{field.label}</label>
                    <input
                      id={inputId}
                      ref={(node) => {
                        fieldRefs.current[field.name] = node;
                      }}
                      name={field.name}
                      type={field.type}
                      value={values[field.name]}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      required
                      disabled={loading}
                      aria-invalid={Boolean(errors[field.name])}
                      aria-describedby={`${helpId}${errors[field.name] ? ` ${errorId}` : ""}`}
                      onChange={(changeEvent) => {
                        const value = changeEvent.target.value;
                        setValues((current) => ({ ...current, [field.name]: value }));
                        setErrors((current) => ({ ...current, [field.name]: undefined }));
                        setStatus(null);
                      }}
                    />
                    <p id={helpId} className={styles.help}>{field.help}</p>
                    {errors[field.name] && (
                      <p id={errorId} className={styles.error}>{errors[field.name]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.primary}
                data-s04-primary
                type="submit"
                disabled={loading}
              >
                {loading ? "Invio in corso…" : "Entra nell’Early Access"}
              </button>
              <a
                className={styles.secondary}
                data-s04-secondary
                href="#section-02-esempio-di-piano"
                onClick={backToExample}
              >
                Rivedi l’esempio di piano
              </a>
            </div>

            <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
              {status?.message}
            </div>
          </form>

          <p className={styles.microcopy} data-s04-microcopy>
            Ti contatteremo quando apriremo i primi accessi.
          </p>
          <p className={styles.privacy}>
            Useremo i dati per gestire la tua richiesta di Early Access e contattarti sui primi accessi, come descritto nell’informativa privacy.
            {" "}<span>Informativa da collegare prima della pubblicazione.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
