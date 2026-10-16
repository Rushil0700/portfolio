/**
 * All portfolio content lives here. To add a project, append an object to
 * `projects`. `tier` decides where it shows up:
 *   - 'featured' → large "channel" card in 01 / WORK (plus a detail page)
 *   - 'index'    → compact row in 02 / INDEX (plus a detail page)
 *   - 'lab'      → tile in 03 / LAB
 *
 * Screenshots: set `image` to a file in /public (e.g. '/work/laweasy.webp',
 * ideally 1600×1000, dark UI). Until then a generative placeholder is drawn
 * on canvas from `art`, so nothing ever looks broken.
 */

export type ArtKind =
  | 'hbp'
  | 'speech'
  | 'chat'
  | 'aqi'
  | 'funds'
  | 'spectrogram'
  | 'graph'
  | 'contour'
  | 'candles'
  | 'nodes'
  | 'agents'
  | 'network'
  | 'scatter'
  | 'blocks';

export type SparkKind = 'speech' | 'rag' | 'aqi' | 'funds';

export interface Project {
  slug: string;
  tier: 'featured' | 'index' | 'lab';
  channel?: string;
  /** Field the project belongs to — shown on cards to show range. */
  domain?: string;
  /** TODO(rushil): confirm years — placeholders until you set real ones. */
  year: string;
  title: string;
  short: string;
  /** One-line outcome shown on the card / row. */
  outcome: string;
  tags: string[];
  art: ArtKind;
  spark?: SparkKind;
  image?: string;
  /**
   * Live, deployed app. Featured cards with `live` open this URL directly
   * instead of the detail page, and the first one is shown full-width.
   */
  live?: { href: string; label: string; note?: string };
  /** Detail page */
  overview: string;
  approach: string[];
  specs?: { label: string; value: string }[];
  links?: { label: string; href: string }[];
}

export const GITHUB = 'https://github.com/Rushil0700';
export const LINKEDIN = 'https://www.linkedin.com/in/rushil-kubavat-687825197';
export const EMAIL = 'Rushil.kubavat54@nmims.in';
export const RESUME = '/resume.pdf';

export const projects: Project[] = [
  {
    slug: 'hbp-finder',
    tier: 'featured',
    channel: '01',
    domain: 'Healthcare',
    year: '2025',
    title: 'HBP Finder',
    short: 'HBP Finder',
    outcome: 'Natural-language clinical cases → the right PMJAY package, out of all 2,441.',
    tags: ['NLP', 'Retrieval', 'Healthcare', 'Cloudflare Workers'],
    art: 'hbp',
    spark: 'rag',
    live: {
      href: 'https://hbp.rushiltech.in',
      label: 'hbp.rushiltech.in',
      note: 'In use at MGM Medical College',
    },
    overview:
      'HBP Finder matches a clinical case written in plain language to the correct PMJAY package across all 2,441 Maharashtra HBP 2025 packages. It runs serverless on Cloudflare Workers and is in use at MGM Medical College.',
    approach: [
      'Indexed every package in the Maharashtra HBP 2025 schedule (2,441 packages).',
      'Maps free-text clinical descriptions onto candidate packages and ranks them.',
      'Deployed at the edge on Cloudflare Workers.',
      'In use at MGM Medical College.',
    ],
    specs: [
      { label: 'Coverage', value: '2,441 packages' },
      { label: 'Schedule', value: 'Maharashtra HBP 2025' },
      { label: 'Runtime', value: 'Cloudflare Workers' },
      { label: 'Status', value: 'Live · MGM Medical College' },
    ],
  },
  {
    slug: 'laweasy',
    tier: 'featured',
    channel: '02',
    domain: 'Legal AI',
    year: '2025',
    title: 'LawEasy',
    short: 'LawEasy',
    outcome: 'Local-first legal RAG that runs fully offline in 16 GB and cites what it says.',
    tags: ['RAG', 'Llama-3-8B', 'QLoRA', 'ChromaDB', 'Ollama'],
    art: 'chat',
    spark: 'rag',
    overview:
      'A legal research assistant that never leaves the machine. LawEasy parses messy legal PDFs, retrieves the right passages with hybrid search and answers with a fine-tuned local model. Three separate layers guard against hallucinated law.',
    approach: [
      'OCR-aware PDF parsing, so scanned judgments and clean digital filings both make it into the index.',
      'Hybrid retrieval: BM25 keyword search fused with dense vectors in ChromaDB, re-ranked with MMR for diversity.',
      'Llama-3-8B fine-tuned with QLoRA and served locally through Ollama; the whole stack fits in 16 GB, fully offline.',
      'Layer 1, relevance gating: low-relevance retrievals are refused instead of being answered.',
      'Layer 2, grounded prompting: the model may only answer from retrieved context.',
      'Layer 3, post-hoc citation checks: every cited passage is verified against the source.',
      'Covered by 30+ automated tests.',
    ],
    specs: [
      { label: 'LLM', value: 'Llama-3-8B · QLoRA' },
      { label: 'Retrieval', value: 'BM25 + dense · MMR' },
      { label: 'Store', value: 'ChromaDB' },
      { label: 'Footprint', value: '16 GB · offline' },
      { label: 'Tests', value: '30+' },
    ],
  },
  {
    slug: 'mutual-funds-predictor',
    tier: 'featured',
    channel: '03',
    domain: 'Finance',
    year: '2025',
    title: 'Mutual Funds Predictor',
    short: 'Mutual Funds Predictor',
    outcome: 'A daily MLOps pipeline that scores ~20,000 funds with explainable forecasts.',
    tags: ['XGBoost', 'MLOps', 'GitHub Actions', 'SHAP', 'Streamlit'],
    art: 'funds',
    spark: 'funds',
    overview:
      'An end-to-end forecasting system for Indian mutual funds. Every day a GitHub Actions pipeline ingests fresh NAVs for about 20,000 funds, rebuilds risk features and re-scores them with a stacked ensemble. Explanations and drift monitoring sit in a Streamlit app.',
    approach: [
      'Stacked ensemble: XGBoost, Random Forest and Ridge, blended by a meta-learner.',
      'Walk-forward validation, so the model is always tested on a future it has not seen.',
      'Daily MLOps pipeline on GitHub Actions ingesting NAVs for about 20,000 funds.',
      'Rolling Alpha, Beta and Sharpe features computed per fund.',
      'SHAP explainability and data-drift monitoring surfaced in Streamlit.',
    ],
    specs: [
      { label: 'Universe', value: '~20,000 funds' },
      { label: 'Model', value: 'XGB + RF + Ridge' },
      { label: 'Validation', value: 'Walk-forward' },
      { label: 'Cadence', value: 'Daily · GH Actions' },
      { label: 'Explain', value: 'SHAP · drift' },
    ],
  },

  {
    slug: 'breathmumbai',
    tier: 'featured',
    channel: '04',
    domain: 'Environment',
    year: '2024',
    title: 'BreathMumbai',
    short: 'BreathMumbai',
    outcome: 'Real-time air quality for Mumbai, forecast 24 hours ahead with anomaly alerts.',
    tags: ['Time-series', 'Ensembles', 'Geospatial', 'Anomaly detection'],
    art: 'aqi',
    spark: 'aqi',
    overview:
      "Real-time air-quality monitoring and forecasting across Mumbai. A stacked ensemble combines spatial and time-series signals to predict 24 hours ahead, and an automated detector flags readings that don't fit the pattern.",
    approach: [
      'Continuous ingestion of station readings for live monitoring.',
      'Spatial features (station neighbourhoods) combined with temporal lags and seasonality.',
      'Stacked ensemble forecaster with 24-hour prediction windows.',
      'Automated anomaly detection that separates sensor glitches and pollution events from normal variation.',
    ],
    specs: [
      { label: 'Horizon', value: '24 h' },
      { label: 'Model', value: 'Stacked ensemble' },
      { label: 'Signals', value: 'Spatial + temporal' },
      { label: 'Ops', value: 'Anomaly detection' },
    ],
  },
  {
    slug: 'speech-enhancement',
    tier: 'featured',
    channel: '05',
    domain: 'Audio · Defense',
    year: '2025',
    title: 'Speech Enhancement for Defense',
    short: 'Speech Enhancement',
    outcome: 'Real-time speech denoising small enough to run on the edge.',
    tags: ['PyTorch', 'Conv-TasNet', 'ONNX', 'DSP'],
    art: 'speech',
    spark: 'speech',
    overview:
      'A speech enhancement model that pulls intelligible speech out of heavy, unpredictable noise, built to run in real time on constrained edge hardware. A lightweight Conv-TasNet is trained on dynamically mixed data and shipped as a quantized ONNX graph.',
    approach: [
      'Lightweight Conv-TasNet: a time-domain separation network trimmed for latency and memory.',
      'Dynamic-SNR data mixing: every batch remixes clean speech and noise at fresh signal-to-noise ratios, so the model never memorises one noise floor.',
      'Augmentation for field conditions: room reverb and clipping, to mimic real radios and microphones.',
      'Trained directly on SI-SNR loss; evaluated on SNR, STOI (intelligibility) and PESQ (perceived quality).',
      'An optional LMS adaptive filter stage for stationary interference.',
      'Exported to ONNX with int8 quantization for real-time inference on the edge.',
    ],
    specs: [
      { label: 'Model', value: 'Conv-TasNet (lightweight)' },
      { label: 'Loss', value: 'SI-SNR' },
      { label: 'Metrics', value: 'SNR · STOI · PESQ' },
      { label: 'Classic DSP', value: 'LMS adaptive filter' },
      { label: 'Deploy', value: 'ONNX · int8' },
    ],
  },
  {
    slug: 'bantu',
    domain: 'AI agents',
    tier: 'index',
    year: '2025',
    title: 'Bantu',
    short: 'Bantu',
    outcome: 'A local agent that breaks goals into sub-tasks and routes each to the right tool.',
    tags: ['Agents', 'Ollama', 'RAG'],
    art: 'agents',
    overview:
      'A local-first agent. Give it a goal and it decomposes it into sub-tasks, then routes each one to local RAG, DuckDuckGo search or an Ollama model, whichever fits best.',
    approach: [
      'Goal decomposition into ordered sub-tasks.',
      'Per-task routing across local RAG, DuckDuckGo web search and Ollama.',
      'Runs entirely on local models.',
    ],
  },
  {
    slug: 'cyber-range',
    domain: 'Security',
    tier: 'index',
    year: '2025',
    title: 'Cyber Range Simulation',
    short: 'Cyber Range',
    outcome: 'Two attackers vs three defenders, learning on a six-layer network.',
    tags: ['RL', 'Q-learning', 'Docker', 'LLM + RAG'],
    art: 'network',
    overview:
      'A multi-agent reinforcement learning cyber range: two attacker agents and three defender agents learn against each other on a six-layer defense-in-depth network inside an isolated Docker lab. LLM + RAG guidance steers exploration.',
    approach: [
      'Multi-agent Q-learning: 2 attackers vs 3 defenders.',
      'Six-layer defense-in-depth topology.',
      'Fully isolated Docker lab environment.',
      'LLM + RAG guided exploration to escape naive random search.',
    ],
  },
  {
    slug: 'conflict-forecaster',
    domain: 'Geopolitics',
    tier: 'index',
    year: '2024',
    title: 'Geopolitical Conflict Forecaster',
    short: 'Conflict Forecaster',
    outcome: 'An ensemble trained on 267 historical conflict scenarios.',
    tags: ['Ensembles', 'XGBoost', 'Forecasting'],
    art: 'scatter',
    overview:
      'Forecasts how geopolitical conflicts unfold with a Random Forest, Gradient Boosting and XGBoost ensemble trained on 267 historical conflict scenarios.',
    approach: [
      'Curated 267 historical conflict scenarios into a structured dataset.',
      'Ensemble of Random Forest, Gradient Boosting and XGBoost.',
    ],
  },

  {
    slug: 'block-blast-agent',
    domain: 'Computer vision',
    tier: 'lab',
    year: '2025',
    title: 'Block Blast Agent',
    short: 'Block Blast Agent',
    outcome: 'A computer-vision agent that plays Block Blast! on Android.',
    tags: ['Computer vision', 'Android', 'Agents'],
    art: 'blocks',
    overview:
      'A computer-vision agent that plays Block Blast! on a real Android device: it reads the board from the screen, picks a placement and performs the move.',
    approach: [
      'Screen capture and board parsing with computer vision.',
      'Placement search over the incoming pieces.',
      'Moves sent to the Android device.',
    ],
  },
];

export const featured = projects.filter((p) => p.tier === 'featured');
export const indexed = projects.filter((p) => p.tier === 'index');
export const lab = projects.filter((p) => p.tier === 'lab');

export const stack = [
  'Python', 'PyTorch', 'Pandas', 'NumPy', 'scikit-learn', 'SQL', 'PostgreSQL',
  'FastAPI', 'Flask', 'LangGraph', 'ONNX', 'AWS', 'Docker', 'Git', 'Streamlit', 'Power BI',
];

export const timeline = [
  {
    period: '2025 — 26',
    role: 'Secretary, Editorial Board',
    org: 'Student Council',
    note: 'Ran literary seminars and technical showcases.',
  },
  {
    period: '2022 — 28',
    role: 'Diploma + B.Tech, Data Science',
    org: 'NMIMS MPSTME',
    note: 'Integrated programme in data science and software engineering.',
  },
  {
    period: '2010 — 22',
    role: 'School',
    org: 'JBCN International School',
    note: '',
  },
];
