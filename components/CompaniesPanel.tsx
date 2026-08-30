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

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Companies + contacts management — compact bento-friendly layout.
 * Collapsible add forms, search, compact list cards.
 */
export function CompaniesPanel({ fill }: { fill?: boolean }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddCompany, setShowAddCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY);
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [busyCompany, setBusyCompany] = useState(false);
  const [companySearch, setCompanySearch] = useState("");

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [busyContact, setBusyContact] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

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
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setCF = (k: keyof typeof EMPTY_COMPANY) => (v: string) =>
    setCompanyForm((f) => ({ ...f, [k]: v }));

  const setCtF = (k: keyof typeof EMPTY_CONTACT) => (v: string) =>
    setContactForm((f) => ({ ...f, [k]: v }));

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyForm.name.trim()) return;
    setBusyCompany(true);
    setError("");
    try {
      if (editingCompany) {
        const { company } = await api<{ company: Company }>(`/api/companies/${editingCompany}`, {
          method: "PATCH", body: JSON.stringify(companyForm),
        });
        setCompanies((prev) => prev.map((c) => (c._id === editingCompany ? company : c)));
        toast("Company updated", "success");
      } else {
        const { company } = await api<{ company: Company }>("/api/companies", {
          method: "POST", body: JSON.stringify(companyForm),
        });
        setCompanies((prev) => [...prev, company]);
        toast("Company added", "success");
      }
      setCompanyForm(EMPTY_COMPANY);
      setEditingCompany(null);
      setShowAddCompany(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusyCompany(false);
    }
  }

  async function deleteCompany(c: Company) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await api(`/api/companies/${c._id}`, { method: "DELETE" });
      setCompanies((prev) => prev.filter((x) => x._id !== c._id));
      setContacts((prev) => prev.map((ct) => ({ ...ct, companyId: "" })));
      toast(`Deleted ${c.name}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    setBusyContact(true);
    setError("");
    try {
      if (editingContact) {
        const { contact } = await api<{ contact: Contact }>(`/api/contacts/${editingContact}`, {
          method: "PATCH", body: JSON.stringify(contactForm),
        });
        setContacts((prev) => prev.map((c) => (c._id === editingContact ? contact : c)));
        toast("Contact updated", "success");
      } else {
        const { contact } = await api<{ contact: Contact }>("/api/contacts", {
          method: "POST", body: JSON.stringify(contactForm),
        });
        setContacts((prev) => [...prev, contact]);
        toast("Contact added", "success");
      }
      setContactForm(EMPTY_CONTACT);
      setEditingContact(null);
      setShowAddContact(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusyContact(false);
    }
  }

  async function deleteContact(c: Contact) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await api(`/api/contacts/${c._id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((x) => x._id !== c._id));
      toast(`Deleted ${c.name}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  if (loading) {
    return <section className={fill ? "flex h-full flex-col" : "mt-8"}><Card className="text-xs text-text-secondary">Loading…</Card></section>;
  }

  const companyName = (id: string) => companies.find((c) => c._id === id)?.name || "";

  const filteredCompanies = companies.filter((c) => {
    if (!companySearch) return true;
    const q = companySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
  });

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || companyName(c.companyId).toLowerCase().includes(q);
  });

  return (
    <section className={fill ? "flex h-full flex-col" : "mt-8"}>
      <h2 className="text-base font-bold text-text-primary">Companies & Contacts</h2>

      {error && (
        <div className="mt-2 rounded-md bg-error/10 px-2.5 py-1.5 text-[11px] text-error">{error}</div>
      )}

      <div className="mt-2 grid gap-3 lg:grid-cols-2 flex-1">
        {/* ── Companies ── */}
        <div className="flex flex-col">
          {/* Header bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies…"
                className={`${inputCls} !pl-7`}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary">🔍</span>
            </div>
            <Button
              variant={showAddCompany ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                setShowAddCompany(!showAddCompany);
                setEditingCompany(null);
                setCompanyForm(EMPTY_COMPANY);
              }}
            >
              {showAddCompany ? "✕" : "+ Add"}
            </Button>
          </div>

          {/* Add form — collapsible */}
          {showAddCompany && (
            <Card className="mt-2 !p-3">
              <form onSubmit={saveCompany} className="space-y-2">
                <input
                  autoFocus required value={companyForm.name} onChange={(e) => setCF("name")(e.target.value)}
                  placeholder="Company name *"
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input value={companyForm.industry} onChange={(e) => setCF("industry")(e.target.value)} placeholder="Industry" className={inputCls} />
                  <input value={companyForm.location} onChange={(e) => setCF("location")(e.target.value)} placeholder="Location" className={inputCls} />
                </div>
                <input value={companyForm.website} onChange={(e) => setCF("website")(e.target.value)} placeholder="Website" className={inputCls} />
                <input value={companyForm.notes} onChange={(e) => setCF("notes")(e.target.value)} placeholder="Notes" className={inputCls} />
                <div className="flex justify-end gap-2 pt-0.5">
                  {editingCompany && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setCompanyForm(EMPTY_COMPANY); setEditingCompany(null); setShowAddCompany(false); }}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="primary" size="sm" disabled={busyCompany || !companyForm.name.trim()}>
                    {busyCompany ? "…" : editingCompany ? "Save" : "Add"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Company list */}
          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
            {filteredCompanies.length === 0 && (
              <p className="py-4 text-center text-[11px] text-text-tertiary">
                {companySearch ? "No matches" : "No companies yet — click + Add"}
              </p>
            )}
            {filteredCompanies.map((c) => {
              const count = appCounts[c.name.trim().toLowerCase()] || 0;
              return (
                <div key={c._id} className="group flex items-center gap-2 rounded-lg border border-border-subtle bg-elevated/50 px-2.5 py-2 transition-all hover:bg-elevated">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold text-text-primary">{c.name}</span>
                      {count > 0 && (
                        <Badge tone="applied" className="!px-1 !py-0 !text-[9px] shrink-0">{count} app{count === 1 ? "" : "s"}</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[10px] text-text-tertiary">
                      {c.industry && <span>{c.industry}</span>}
                      {c.location && <span>📍 {c.location}</span>}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">link ↗</a>
                      )}
                    </div>
                    {c.notes && <p className="mt-0.5 truncate text-[10px] italic text-text-tertiary">{c.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setCompanyForm({ name: c.name, website: c.website, industry: c.industry, location: c.location, notes: c.notes });
                      setEditingCompany(c._id);
                      setShowAddCompany(true);
                    }}>✏️</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCompany(c)}>✕</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Contacts ── */}
        <div className="flex flex-col">
          {/* Header bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts…"
                className={`${inputCls} !pl-7`}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary">🔍</span>
            </div>
            <Button
              variant={showAddContact ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                setShowAddContact(!showAddContact);
                setEditingContact(null);
                setContactForm(EMPTY_CONTACT);
              }}
            >
              {showAddContact ? "✕" : "+ Add"}
            </Button>
          </div>

          {/* Add form — collapsible */}
          {showAddContact && (
            <Card className="mt-2 !p-3">
              <form onSubmit={saveContact} className="space-y-2">
                <input autoFocus required value={contactForm.name} onChange={(e) => setCtF("name")(e.target.value)} placeholder="Name *" className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="email" value={contactForm.email} onChange={(e) => setCtF("email")(e.target.value)} placeholder="Email" className={inputCls} />
                  <input value={contactForm.phone} onChange={(e) => setCtF("phone")(e.target.value)} placeholder="Phone" className={inputCls} />
                </div>
                <select value={contactForm.companyId} onChange={(e) => setCtF("companyId")(e.target.value)} className={inputCls}>
                  <option value="">No company</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <input value={contactForm.notes} onChange={(e) => setCtF("notes")(e.target.value)} placeholder="Notes" className={inputCls} />
                <div className="flex justify-end gap-2 pt-0.5">
                  {editingContact && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setContactForm(EMPTY_CONTACT); setEditingContact(null); setShowAddContact(false); }}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="primary" size="sm" disabled={busyContact || !contactForm.name.trim()}>
                    {busyContact ? "…" : editingContact ? "Save" : "Add"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Contact list */}
          <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
            {filteredContacts.length === 0 && (
              <p className="py-4 text-center text-[11px] text-text-tertiary">
                {contactSearch ? "No matches" : "No contacts yet — click + Add"}
              </p>
            )}
            {filteredContacts.map((c) => {
              const coName = companyName(c.companyId);
              return (
                <div key={c._id} className="group flex items-center gap-2 rounded-lg border border-border-subtle bg-elevated/50 px-2.5 py-2 transition-all hover:bg-elevated">
                  {/* Avatar */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold text-text-primary">{c.name}</span>
                      {coName && <Badge tone="screening" className="!px-1 !py-0 !text-[9px] shrink-0">{coName}</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[10px] text-text-tertiary">
                      {c.email && <a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                    {c.notes && <p className="mt-0.5 truncate text-[10px] italic text-text-tertiary">{c.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setContactForm({ name: c.name, email: c.email, phone: c.phone, companyId: c.companyId, notes: c.notes });
                      setEditingContact(c._id);
                      setShowAddContact(true);
                    }}>✏️</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteContact(c)}>✕</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
