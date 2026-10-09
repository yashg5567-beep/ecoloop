import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  Landmark,
  Copy,
  Mail,
  MessageCircle,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import {
  OfficialChannelResource,
  SimulatedPickupRequest,
  WasteCategory,
  WasteCategoryEnum,
  sanitizeText,
} from '../types/waste';

interface DisposeViewProps {
  defaultItemName?: string;
  defaultCategory?: WasteCategory;
  pickupRequests: SimulatedPickupRequest[];
  officialChannels: OfficialChannelResource[];
  onSavePickupRequest: (req: SimulatedPickupRequest) => void;
  onUpdateOfficialChannels: (channels: OfficialChannelResource[]) => void;
  onOpenMap: () => void;
  onBackToScan: () => void;
}

export const DisposeView: React.FC<DisposeViewProps> = ({
  defaultItemName = '',
  defaultCategory = 'e-waste',
  pickupRequests,
  officialChannels,
  onSavePickupRequest,
  onUpdateOfficialChannels,
  onOpenMap,
  onBackToScan,
}) => {
  const [name, setName] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [itemDesc, setItemDesc] = useState<string>(defaultItemName);
  const [category, setCategory] = useState<WasteCategory>(defaultCategory);
  const [preferredTime, setPreferredTime] = useState<string>('This Weekend (10:00 AM – 1:00 PM)');
  const [formError, setFormError] = useState<string | null>(null);
  const [latestRequest, setLatestRequest] = useState<SimulatedPickupRequest | null>(
    pickupRequests[0] || null
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [isEditingChannels, setIsEditingChannels] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newOrgType, setNewOrgType] =
    useState<OfficialChannelResource['organizationType']>('Municipal');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newHint, setNewHint] = useState<string>('');

  const handleCreateSimulatedRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!locality.trim() || !itemDesc.trim()) {
      setFormError('Please enter your locality and the item description to generate a request.');
      return;
    }

    const req: SimulatedPickupRequest = {
      id: `pk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: sanitizeText(name) || undefined,
      locality: sanitizeText(locality),
      itemDescription: sanitizeText(itemDesc),
      category,
      preferredTime: sanitizeText(preferredTime),
      status: 'Simulated (Demo Only)',
    };

    onSavePickupRequest(req);
    setLatestRequest(req);
  };

  const prefilledCollectorMessage = latestRequest
    ? `Hello, I would like to arrange a dry-waste / e-waste collection pickup.\n` +
      `Item: ${latestRequest.itemDescription} (${latestRequest.category.toUpperCase()})\n` +
      `Locality / Area: ${latestRequest.locality}\n` +
      `Preferred Window: ${latestRequest.preferredTime}\n` +
      `${latestRequest.name ? `Contact Name: ${latestRequest.name}\n` : ''}` +
      `(Prepared via Econom Circularity Assistant)`
    : '';

  const handleCopyMessage = async () => {
    if (!prefilledCollectorMessage) return;
    try {
      await navigator.clipboard.writeText(prefilledCollectorMessage);
      setCopyFeedback('Collector message copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      setCopyFeedback('Please select and copy the text manually.');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const added: OfficialChannelResource = {
      id: `oc-${Date.now()}`,
      title: sanitizeText(newTitle),
      organizationType: newOrgType,
      description: sanitizeText(newDesc),
      actionHint:
        sanitizeText(newHint) || 'Check your city’s official website for verified contact details.',
      isPlaceholder: true,
    };
    onUpdateOfficialChannels([...officialChannels, added]);
    setNewTitle('');
    setNewDesc('');
    setNewHint('');
  };

  const handleDeleteChannel = (id: string) => {
    onUpdateOfficialChannels(officialChannels.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
            📍 Three Ways to Hand It Off
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
            How to Dispose &amp; Recover
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Pick your move: message a local collector, drop it off on the map, or check official
            city &amp; brand take-back directories.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToScan}
          className="min-h-[42px] px-4 py-2 rounded-2xl bg-white dark:bg-[#14241B] hover:bg-stone-100 border border-stone-200 dark:border-emerald-800 text-xs sm:text-sm font-display font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 transition-transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </button>
      </div>

      {/* Three Pathways Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* OPTION A: Request Pickup (Simulated + Prefilled Message) */}
        <section className="lg:col-span-6 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
              OPTION A · LOCAL COLLECTOR COORDINATION
            </div>
            <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#10B981] dark:text-[#C6F432]" />
              <span>Request a Pickup</span>
            </h2>
          </div>

          {/* Mandatory Demo Disclaimer */}
          <div className="p-4 rounded-[20px] bg-[#FFD84D]/25 border border-amber-400 text-xs text-stone-950 dark:text-white flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 dark:text-[#FFD84D] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Demo: no pickup is scheduled automatically.</strong>{' '}
              Since no live logistics fleet is connected, submitting this form saves a simulated
              request in your browser and generates a prefilled message you can copy or send via
              WhatsApp or Email to your local collector.
            </div>
          </div>

          <form onSubmit={handleCreateSimulatedRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="pk-name"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  Your Name (Optional)
                </label>
                <input
                  id="pk-name"
                  type="text"
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Priya"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="pk-locality"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  Locality / Neighborhood *
                </label>
                <input
                  id="pk-locality"
                  type="text"
                  required
                  maxLength={100}
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g., Indiranagar Ward 80"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="pk-item"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  Item Description *
                </label>
                <input
                  id="pk-item"
                  type="text"
                  required
                  maxLength={120}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="e.g., 2 old keyboards & 5 kg cardboard"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="pk-category"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  Primary Category
                </label>
                <select
                  id="pk-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WasteCategory)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
                >
                  {WasteCategoryEnum.options.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="pk-time"
                className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
              >
                Preferred Time Window
              </label>
              <input
                id="pk-time"
                type="text"
                maxLength={80}
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
              />
            </div>

            {formError && <p className="text-xs text-[#FF6B5E] font-bold">{formError}</p>}

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save Simulated Request &amp; Prep Collector Message (+20 pts)</span>
            </button>
          </form>

          {/* Prefilled Collector Message Box */}
          {latestRequest && (
            <div className="pt-4 border-t border-stone-200 dark:border-emerald-900/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 dark:text-white">
                  Prefilled Collector Message
                </span>
                <span className="text-amber-700 dark:text-[#FFD84D] font-mono font-bold">
                  {latestRequest.status}
                </span>
              </div>

              <pre className="p-4 rounded-[20px] bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800 text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-mono leading-relaxed">
                {prefilledCollectorMessage}
              </pre>

              {copyFeedback && (
                <div className="text-xs font-bold text-[#10B981] dark:text-[#C6F432]">
                  {copyFeedback}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-[#C6F432] text-white dark:text-[#0F1A14] text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(prefilledCollectorMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs font-extrabold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Collector</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Waste Collection Request - ${latestRequest.locality}`
                  )}&body=${encodeURIComponent(prefilledCollectorMessage)}`}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-emerald-950 text-stone-900 dark:text-white border border-stone-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: OPTION B (Drop-Off Map) + OPTION C (Official Government & OEM Channels) */}
        <div className="lg:col-span-6 space-y-6">
          {/* OPTION B: Drop-Off Locations */}
          <section className="bg-gradient-to-br from-[#0F1A14] via-[#153122] to-[#0A140E] border border-emerald-800/80 text-white rounded-[28px] p-6 sm:p-7 space-y-4 shadow-md">
            <div className="text-xs font-mono font-bold text-[#C6F432]">
              OPTION B · SELF DROP-OFF LOCATOR
            </div>
            <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#22C55E]" />
              <span>Find Nearby Drop-Off Facilities</span>
            </h2>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Open the interactive OpenStreetMap locator to find recycling centers, e-waste drop-off
              points, and scrap aggregators near your locality. Never sends your location to the AI.
            </p>
            <div>
              <button
                type="button"
                onClick={onOpenMap}
                className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] font-display font-black text-sm flex items-center gap-2 transition-transform active:scale-95"
              >
                <MapPin className="w-4 h-4" />
                <span>Open Nearby Facilities Map</span>
              </button>
            </div>
          </section>

          {/* OPTION C: Government & Official Channels (Configurable List) */}
          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                  OPTION C · OFFICIAL &amp; OEM CHANNELS
                </div>
                <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#10B981] dark:text-[#C6F432]" />
                  <span>Government &amp; Brand Take-Back</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingChannels(!isEditingChannels)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950 hover:bg-stone-200 text-stone-800 dark:text-stone-100 text-xs font-bold flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingChannels ? 'Done Editing' : 'Customize List'}</span>
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              We never invent fake URLs, phone numbers, or claims of authorisation. Customize the
              directory below with your city’s verified municipal, Pollution Control Board
              (CPCB/SPCB), and brand take-back links.
            </p>

            <div className="space-y-3">
              {officialChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="p-4 rounded-[22px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200/90 dark:border-emerald-800/80 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[#10B981] dark:text-[#C6F432] font-mono font-bold">
                      {ch.organizationType}
                      {ch.isPlaceholder ? ' · Configurable Placeholder' : ''}
                    </div>
                    {isEditingChannels && (
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="text-stone-400 hover:text-[#FF6B5E] p-1"
                        title="Remove channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {ch.description}
                  </p>
                  <div className="text-xs font-mono text-stone-700 dark:text-emerald-200 pt-1">
                    {ch.actionHint}
                  </div>
                </div>
              ))}
            </div>

            {isEditingChannels && (
              <form
                onSubmit={handleAddChannel}
                className="pt-4 border-t border-stone-200 dark:border-emerald-900/60 space-y-3"
              >
                <div className="text-xs font-bold text-stone-900 dark:text-white">
                  Add a Verified Local Channel or City Placeholder
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Channel title (e.g., Ward Dry Waste Helpline)"
                    className="min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                  />
                  <select
                    value={newOrgType}
                    onChange={(e) =>
                      setNewOrgType(
                        e.target.value as OfficialChannelResource['organizationType']
                      )
                    }
                    className="min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                  >
                    <option value="Municipal">Municipal</option>
                    <option value="Pollution Control Board">Pollution Control Board</option>
                    <option value="National Portal">National Portal</option>
                    <option value="Manufacturer Take-Back">Manufacturer Take-Back</option>
                  </select>
                </div>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description of what this channel accepts..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                />
                <input
                  type="text"
                  maxLength={140}
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="Verified note or placeholder (e.g., Check your city's official website)"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs font-display font-extrabold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Channel to List</span>
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
