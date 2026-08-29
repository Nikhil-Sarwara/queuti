"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Company {
  _id: string;
  name: string;
  website: string;
  industry: string;
  location: string;
  notes: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyId: string;
  notes: string;
}

interface ApiApp {
  _id: string;
  companyName: string;
}

const EMPTY_COMPANY = { name: "", website: "", industry: "", location: "", notes: "" };
const EMPTY_CONTACT = { name: "", email: "", phone: "", companyId: "", notes: "" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

/**
 * Companies + contacts management. CRUD round-trips against
 * /api/companies and /api/contacts; applications linked by company name
 * are counted per company so the tracker relationship is visible.
 */
export function CompaniesPanel() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [busyCompany, setBusyCompany] = useState(false);

  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [busyContact, setBusyContact] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, ct, a] = await Promise.all([
        api<{ companies: Company[] }>("/api/companies"),
        api<{ contacts: Contact[] }>("/api/contacts"),
        api<{ applications: ApiApp[] }>("/api/applications"),
      ]);
      setCompanies(c.companies);
      setContacts(ct.contacts);
      const counts: Record<string, number> = {};
      for (const app of a.applications) {
        const name = app.companyName.trim().toLowerCase();
        if (!name) continue;
        counts[name] = (counts[name] || 0) + 1;
      }
      setAppCounts(counts);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load companies/contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setCF = (k: keyof typeof EMPTY_COMPANY) => (v: string) =>
    setCompanyForm((f) => ({ ...f, [k]: v }));

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyForm.name.trim()) return;
    setBusyCompany(true);
    setError("");
    try {
      if (editingCompany) {
        const { company } = await api<{ company: Company }>(
          `/api/companies/${editingCompany}`,
          { method: "PATCH", body: JSON.stringify(companyForm) }
        );
        setCompanies((prev) => prev.map((c) => (c._id === editingCompany ? company : c)));
      } else {
        const { company } = await api<{ company: Company }>("/api/companies", {
          method: "POST",
          body: JSON.stringify(companyForm),
        });
        setCompanies((prev) => [...prev, company]);
      }
      setCompanyForm(EMPTY_COMPANY);
      setEditingCompany(null);
      toast(editingCompany ? "Company updated" : "Company added", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company");
    } finally {
      setBusyCompany(false);
    }
  }

  async function deleteCompany(c: Company) {
    if (!confirm(`Delete company "${c.name}"?`)) return;
    setError("");
    try {
      await api(`/api/companies/${c._id}`, { method: "DELETE" });
      setCompanies((prev) => prev.filter((x) => x._id !== c._id));
      setContacts((prev) => prev.map((ct) => ({ ...ct, companyId: "" })));
      toast(`Deleted ${c.name}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    }
  }

  const setCtF = (k: keyof typeof EMPTY_CONTACT) => (v: string) =>
    setContactForm((f) => ({ ...f, [k]: v }));

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    setBusyContact(true);
    setError("");
    try {
      if (editingContact) {
        const { contact } = await api<{ contact: Contact }>(
          `/api/contacts/${editingContact}`,
          { method: "PATCH", body: JSON.stringify(contactForm) }
        );
        setContacts((prev) => prev.map((c) => (c._id === editingContact ? contact : c)));
      } else {
        const { contact } = await api<{ contact: Contact }>("/api/contacts", {
          method: "POST",
          body: JSON.stringify(contactForm),
        });
        setContacts((prev) => [...prev, contact]);
      }
      setContactForm(EMPTY_CONTACT);
      setEditingContact(null);
      toast(editingContact ? "Contact updated" : "Contact added", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setBusyContact(false);
    }
  }

  async function deleteContact(c: Contact) {
    if (!confirm(`Delete contact "${c.name}"?`)) return;
    setError("");
    try {
      await api(`/api/contacts/${c._id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((x) => x._id !== c._id));
      toast(`Deleted ${c.name}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  if (loading) {
    return (
      <section className="mt-8">
        <Card className="text-sm text-text-secondary">Loading companies & contacts…</Card>
      </section>
    );
  }

  const companyName = (id: string) =>
    companies.find((c) => c._id === id)?.name || "";

  const inputCls =
    "w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-text-primary">
        Companies & Contacts
      </h2>

      {error && (
        <Card className="mt-3 border-error/20" role="alert">
          <p className="text-sm font-semibold text-error">{error}</p>
        </Card>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* ---- Companies ---- */}
        <Card>
          <h3 className="text-base font-bold text-text-primary">
            Companies
          </h3>
          <form onSubmit={saveCompany} className="mt-3 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <TextField label="Name *" name="co-name" required value={companyForm.name} onChange={(e) => setCF("name")(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="col-span-2">
              <TextField label="Website" name="co-site" value={companyForm.website} onChange={(e) => setCF("website")(e.target.value)} placeholder="https://acme.com" />
            </div>
            <div>
              <TextField label="Industry" name="co-ind" value={companyForm.industry} onChange={(e) => setCF("industry")(e.target.value)} placeholder="SaaS" />
            </div>
            <div>
              <TextField label="Location" name="co-loc" value={companyForm.location} onChange={(e) => setCF("location")(e.target.value)} placeholder="Melbourne" />
            </div>
            <div className="col-span-2">
              <TextField label="Notes" name="co-notes" value={companyForm.notes} onChange={(e) => setCF("notes")(e.target.value)} placeholder="Referral via Priya…" />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              {editingCompany && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setCompanyForm(EMPTY_COMPANY); setEditingCompany(null); }}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm" disabled={busyCompany || !companyForm.name.trim()}>
                {busyCompany ? "Saving…" : editingCompany ? "Save company" : "Add company"}
              </Button>
            </div>
          </form>

          <ul className="mt-4 max-h-[400px] space-y-2 overflow-y-auto scrollbar-thin">
            {companies.length === 0 && (
              <li className="text-sm italic text-text-tertiary">No companies yet.</li>
            )}
            {companies.map((c) => {
              const count = appCounts[c.name.trim().toLowerCase()] || 0;
              return (
                <li key={c._id} className="rounded-lg border border-border-subtle bg-elevated p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary">{c.name}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-tertiary">
                        {count > 0 && (
                          <span className="font-semibold text-success">{count} application{count === 1 ? "" : "s"}</span>
                        )}
                        {c.industry && <span>{c.industry}</span>}
                        {c.location && <span>{c.location}</span>}
                        {c.website && (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:text-text-primary">
                            site ↗
                          </a>
                        )}
                      </p>
                      {c.notes && <p className="mt-0.5 line-clamp-2 text-xs italic text-text-tertiary">{c.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" title="Edit" aria-label={`Edit company ${c.name}`} onClick={() => { setCompanyForm({ name: c.name, website: c.website, industry: c.industry, location: c.location, notes: c.notes }); setEditingCompany(c._id); }}>
                        ✏️
                      </Button>
                      <Button size="sm" variant="ghost" title="Delete" aria-label={`Delete company ${c.name}`} onClick={() => deleteCompany(c)}>
                        ✕
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ---- Contacts ---- */}
        <Card>
          <h3 className="text-base font-bold text-text-primary">
            Contacts
          </h3>
          <form onSubmit={saveContact} className="mt-3 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Name *
              </label>
              <input required value={contactForm.name} onChange={(e) => setCtF("name")(e.target.value)} placeholder="Priya Sharma" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Email
              </label>
              <input type="email" value={contactForm.email} onChange={(e) => setCtF("email")(e.target.value)} placeholder="priya@acme.com" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Phone
              </label>
              <input value={contactForm.phone} onChange={(e) => setCtF("phone")(e.target.value)} placeholder="+61 4xx xxx xxx" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Company
              </label>
              <select
                className={`mt-1.5 ${inputCls}`}
                value={contactForm.companyId}
                onChange={(e) => setCtF("companyId")(e.target.value)}
              >
                <option value="">— none —</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                Notes
              </label>
              <input value={contactForm.notes} onChange={(e) => setCtF("notes")(e.target.value)} placeholder="Recruiter, met at meetup…" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              {editingContact && (
                <Button type="button" variant="secondary" size="sm" onClick={() => { setContactForm(EMPTY_CONTACT); setEditingContact(null); }}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" size="sm" disabled={busyContact || !contactForm.name.trim()}>
                {busyContact ? "Saving…" : editingContact ? "Save contact" : "Add contact"}
              </Button>
            </div>
          </form>

          <ul className="mt-4 max-h-[400px] space-y-2 overflow-y-auto scrollbar-thin">
            {contacts.length === 0 && (
              <li className="text-sm italic text-text-tertiary">No contacts yet.</li>
            )}
            {contacts.map((c) => (
              <li key={c._id} className="rounded-lg border border-border-subtle bg-elevated p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary">{c.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                      {companyName(c.companyId) && (
                        <Badge tone="screening" dot className="!px-1.5 !text-[10px]">{companyName(c.companyId)}</Badge>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:text-text-primary">
                          {c.email}
                        </a>
                      )}
                      {c.phone && <span>{c.phone}</span>}
                    </p>
                    {c.notes && <p className="mt-0.5 line-clamp-2 text-xs italic text-text-tertiary">{c.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" title="Edit" aria-label={`Edit contact ${c.name}`} onClick={() => { setContactForm({ name: c.name, email: c.email, phone: c.phone, companyId: c.companyId, notes: c.notes }); setEditingContact(c._id); }}>
                      ✏️
                    </Button>
                    <Button size="sm" variant="ghost" title="Delete" aria-label={`Delete contact ${c.name}`} onClick={() => deleteContact(c)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
