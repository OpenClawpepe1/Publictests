"""
DOJ Epstein Files — Search Dashboard
=====================================
A local Streamlit dashboard to search and browse the DOJ Epstein Library.

Install & Run:
    pip install streamlit requests beautifulsoup4
    streamlit run epstein_dashboard.py
"""

import streamlit as st
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
import time

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://www.justice.gov"
NUM_DATASETS = 12

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Referer": "https://www.justice.gov/epstein",
}

# ─────────────────────────────────────────────────────────────────────────────
# PAGE SETUP
# ─────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Epstein Files — DOJ Search",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'IBM Plex Sans', sans-serif;
    }

    /* Dark background */
    .stApp {
        background-color: #0d0f14;
        color: #c8cdd8;
    }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #111318;
        border-right: 1px solid #1e2230;
    }

    /* Header */
    .main-header {
        border-bottom: 1px solid #1e2230;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
    }
    .main-header h1 {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 1.6rem;
        font-weight: 600;
        color: #e8ebf2;
        letter-spacing: -0.02em;
        margin: 0;
    }
    .main-header p {
        color: #5a6070;
        font-size: 0.82rem;
        margin: 0.3rem 0 0 0;
    }

    /* Tag badge */
    .tag {
        display: inline-block;
        background: #1a1e2a;
        border: 1px solid #2a3044;
        color: #6b7a99;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 3px;
        margin-right: 4px;
    }
    .tag-accent {
        background: #0f1e35;
        border-color: #1e4080;
        color: #4d8cf5;
    }

    /* Result cards */
    .result-card {
        background: #111318;
        border: 1px solid #1e2230;
        border-radius: 6px;
        padding: 14px 16px;
        margin-bottom: 10px;
        transition: border-color 0.15s;
    }
    .result-card:hover {
        border-color: #2a3a5c;
    }
    .result-card .filename {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.85rem;
        color: #4d8cf5;
        font-weight: 600;
    }
    .result-card .meta {
        font-size: 0.75rem;
        color: #4a5168;
        margin-top: 3px;
    }
    .result-card .snippet {
        font-size: 0.82rem;
        color: #8090a8;
        margin-top: 8px;
        line-height: 1.5;
        border-left: 2px solid #1e2c44;
        padding-left: 10px;
    }
    .result-card .actions {
        margin-top: 10px;
        display: flex;
        gap: 8px;
    }
    .result-card a {
        color: #4d8cf5;
        text-decoration: none;
        font-size: 0.78rem;
        border: 1px solid #1e3a6e;
        padding: 3px 10px;
        border-radius: 3px;
        background: #0f1e35;
    }
    .result-card a:hover {
        background: #142848;
    }

    /* Stats bar */
    .stats-bar {
        background: #0f1115;
        border: 1px solid #1a1e2a;
        border-radius: 4px;
        padding: 8px 14px;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.75rem;
        color: #4a5168;
        margin-bottom: 1.2rem;
        display: flex;
        gap: 24px;
    }
    .stats-bar span { color: #8090a8; }
    .stats-bar strong { color: #c8cdd8; }

    /* File list */
    .file-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid #141820;
        font-size: 0.82rem;
    }
    .file-item:hover { background: #111520; }
    .file-item .fname {
        font-family: 'IBM Plex Mono', monospace;
        color: #8090a8;
    }
    .file-item a { color: #4d8cf5; text-decoration: none; font-size: 0.75rem; }

    /* Divider */
    hr { border-color: #1e2230; }

    /* Empty state */
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: #3a4258;
        font-size: 0.88rem;
    }
    .empty-state .icon { font-size: 2rem; margin-bottom: 0.5rem; }

    /* Streamlit widget overrides */
    .stTextInput > div > div > input {
        background-color: #111318 !important;
        border: 1px solid #1e2230 !important;
        color: #c8cdd8 !important;
        font-family: 'IBM Plex Mono', monospace !important;
    }
    .stSelectbox > div > div {
        background-color: #111318 !important;
        border: 318 !important;
1px solid #1e2230 !important;
    }
    .stButton > button {
        background: #132040 !important;
        color: #4d8cf5 !important;
        border: 1px solid #1e3a6e !important;
        font-family: 'IBM Plex Mono', monospace !important;
        font-size: 0.82rem !important;
    }
    .stButton > button:hover {
        background: #1a2e55 !important;
    }

    /* Section headers */
    .section-header {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 0.7rem;
        color: #3a4258;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.8rem;
        padding-bottom: 0.4rem;
        border-bottom: 1px solid #1a1e2a;
    }
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# SCRAPING FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_data(ttl=300, show_spinner=False)
def search_doj(query: str, page: int = 0) -> dict:
    """
    Query the DOJ's Epstein search endpoint.
    Returns { results: [...], has_next: bool, total_hint: str }
    """
    url = f"{BASE_URL}/epstein/search"
    params = {"keys": query, "page": page}

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        return {"error": str(e), "results": []}

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # DOJ Drupal search results are typically in .views-row or search-result items
    # Try multiple possible selectors
    rows = (
        soup.select(".views-row") or
        soup.select(".search-result") or
        soup.select("article") or
        soup.select(".view-content > div") or
        []
    )

    for row in rows:
        title_el = row.find("h3") or row.find("h2") or row.find(".views-field-title")
        link_el = row.find("a", href=True)
        snippet_el = row.find(".views-field-body") or row.find(".search-snippet") or row.find("p")

        if not link_el:
            continue

        href = link_el.get("href", "")
        full_url = urljoin(BASE_URL, href) if not href.startswith("http") else href
        title = (title_el.get_text(strip=True) if title_el else link_el.get_text(strip=True)) or href.split("/")[-1]
        snippet = snippet_el.get_text(strip=True)[:300] if snippet_el else ""

        # Determine dataset from URL
        dataset = None
        for i in range(1, NUM_DATASETS + 1):
            if f"DataSet%20{i}" in href or f"DataSet {i}" in href or f"data-set-{i}" in href:
                dataset = i
                break

        results.append({
            "title": title,
            "url": full_url,
            "snippet": snippet,
            "dataset": dataset,
            "is_pdf": href.lower().endswith(".pdf"),
        })

    # Check pagination
    next_link = soup.find("a", string="Next") or soup.find("a", {"rel": "next"})
    has_next = next_link is not None

    # Try to find total count hint
    total_hint = ""
    count_el = soup.find(class_="search-results-count") or soup.find(class_="view-header")
    if count_el:
        total_hint = count_el.get_text(strip=True)

    return {
        "results": results,
        "has_next": has_next,
        "total_hint": total_hint,
        "raw_url": resp.url,
    }


@st.cache_data(ttl=600, show_spinner=False)
def get_dataset_files(dataset_num: int, page: int = 0) -> dict:
    """Fetch file listings for a specific dataset page."""
    url = f"{BASE_URL}/epstein/doj-disclosures/data-set-{dataset_num}-files"
    params = {"page": page}

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        return {"error": str(e), "files": [], "pages": 1}

    soup = BeautifulSoup(resp.text, "html.parser")
    links = soup.select("a[href*='/epstein/files/']")

    files = []
    for a in links:
        href = a["href"]
        filename = href.split("/")[-1]
        full_url = urljoin(BASE_URL, href)
        files.append({"filename": filename, "url": full_url, "href": href})

    # Count pages from pagination
    page_links = soup.select(".pager__item a, .pagination a")
    pages = 1
    for pl in page_links:
        try:
            n = int(pl.get_text(strip=True))
            if n > pages:
                pages = n
        except ValueError:
            pass

    # Also check last page link
    last_link = soup.find("a", string="Last")
    if last_link and last_link.get("href"):
        try:
            import re
            m = re.search(r"page=(\d+)", last_link["href"])
            if m:
                pages = int(m.group(1)) + 1
        except Exception:
            pass

    return {"files": files, "pages": pages, "current_page": page}


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR
# ─────────────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("""
    <div style="padding: 0.5rem 0 1rem 0;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 1rem; font-weight: 600; color: #e8ebf2;">
            🗂 Epstein Files
        </div>
        <div style="font-size: 0.72rem; color: #3a4258; margin-top: 3px;">
            DOJ Library — justice.gov
        </div>
    </div>
    """, unsafe_allow_html=True)

    mode = st.radio(
        "Mode",
        ["🔍 Search", "📁 Browse Datasets"],
        label_visibility="collapsed",
    )

    st.markdown("---")
    st.markdown('<div class="section-header">Quick Links</div>', unsafe_allow_html=True)

    st.markdown("""
    <div style="font-size: 0.78rem; line-height: 2;">
        <a href="https://www.justice.gov/epstein" target="_blank" style="color: #4d8cf5;">🏠 Epstein Library</a><br>
        <a href="https://www.justice.gov/epstein/doj-disclosures" target="_blank" style="color: #4d8cf5;">📋 DOJ Disclosures</a><br>
        <a href="https://www.justice.gov/epstein/search" target="_blank" style="color: #4d8cf5;">🔎 Full Search (DOJ)</a><br>
        <a href="https://oversight.house.gov/release/oversight-committee-releases-epstein-records-provided-by-the-department-of-justice/" target="_blank" style="color: #4d8cf5;">🏛 House Disclosures</a>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("""
    <div style="font-size: 0.7rem; color: #2a3248; line-height: 1.6;">
        All files are sourced directly from<br>
        <strong style="color: #3a4a68;">justice.gov</strong><br>
        Released under the Epstein Files<br>
        Transparency Act (H.R.4405)
    </div>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CONTENT
# ─────────────────────────────────────────────────────────────────────────────

st.markdown("""
<div class="main-header">
    <h1>🗂 DOJ Epstein Files Dashboard</h1>
    <p>Search and browse documents released under the Epstein Files Transparency Act (H.R.4405) · 3.5M+ pages · 12 datasets</p>
</div>
""", unsafe_allow_html=True)

# ─── SEARCH MODE ─────────────────────────────────────────────────────────────
if "🔍" in mode:
    st.markdown('<div class="section-header">Search the Library</div>', unsafe_allow_html=True)

    col1, col2 = st.columns([5, 1])
    with col1:
        query = st.text_input(
            "query",
            placeholder="Search by name, keyword, date, case number…",
            label_visibility="collapsed",
            key="search_query",
        )
    with col2:
        search_btn = st.button("Search →", use_container_width=True)

    # Page state
    if "search_page" not in st.session_state:
        st.session_state.search_page = 0
    if "last_query" not in st.session_state:
        st.session_state.last_query = ""

    if query and query != st.session_state.last_query:
        st.session_state.search_page = 0
        st.session_state.last_query = query

    if query:
        with st.spinner(f'Searching DOJ for "{query}"...'):
            data = search_doj(query, page=st.session_state.search_page)

        if "error" in data:
            st.error(f"Request failed: {data['error']}")
            st.info("Try opening the search directly: [justice.gov/epstein/search](https://www.justice.gov/epstein/search)")
        else:
            results = data.get("results", [])
            total_hint = data.get("total_hint", "")

            # Stats bar
            page_num = st.session_state.search_page + 1
            st.markdown(f"""
            <div class="stats-bar">
                <span>QUERY <strong>"{query}"</strong></span>
                <span>RESULTS <strong>{len(results)}</strong> on this page</span>
                <span>PAGE <strong>{page_num}</strong></span>
                {"<span>" + total_hint + "</span>" if total_hint else ""}
            </div>
            """, unsafe_allow_html=True)

            # Also show the raw DOJ search link
            doj_search_url = f"https://www.justice.gov/epstein/search?keys={quote(query)}"
            st.markdown(
                f'<div style="font-size:0.75rem; color:#3a4258; margin-bottom:1rem;">'
                f'🔗 <a href="{doj_search_url}" target="_blank" style="color:#2a4a80;">Open this query on justice.gov</a>'
                f'</div>',
                unsafe_allow_html=True
            )

            if not results:
                st.markdown("""
                <div class="empty-state">
                    <div class="icon">📭</div>
                    No results returned. The DOJ search may have limited OCR coverage.<br>
                    Try a broader term, or browse datasets directly.
                </div>
                """, unsafe_allow_html=True)
            else:
                for r in results:
                    ds_tag = f'<span class="tag tag-accent">Dataset {r["dataset"]}</span>' if r["dataset"] else ""
                    pdf_tag = '<span class="tag">PDF</span>' if r["is_pdf"] else ""
                    snippet_html = f'<div class="snippet">{r["snippet"]}</div>' if r["snippet"] else ""

                    st.markdown(f"""
                    <div class="result-card">
                        <div class="filename">{r['title']}</div>
                        <div class="meta">{ds_tag}{pdf_tag}<span class="tag">{r['url'].replace('https://www.justice.gov', '')[:80]}</span></div>
                        {snippet_html}
                        <div class="actions">
                            <a href="{r['url']}" target="_blank">Open ↗</a>
                            {"<a href='" + r['url'] + "' download>Download ⬇</a>" if r["is_pdf"] else ""}
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

            # Pagination
            pcol1, pcol2, pcol3 = st.columns([1, 2, 1])
            with pcol1:
                if st.session_state.search_page > 0:
                    if st.button("← Prev"):
                        st.session_state.search_page -= 1
                        st.rerun()
            with pcol3:
                if data.get("has_next"):
                    if st.button("Next →"):
                        st.session_state.search_page += 1
                        st.rerun()

    else:
        # Idle state with quick-search suggestions
        st.markdown("""
        <div class="empty-state">
            <div class="icon">🔍</div>
            Type a name, keyword, or EFTA document number above to search.<br><br>
            <span style="color: #2a3850; font-size: 0.75rem;">
            Suggestions: maxwell · flight log · epstein · palm beach · EFTA02731082<br>
            Note: DOJ warns that scanned documents may not be fully text-searchable.
            </span>
        </div>
        """, unsafe_allow_html=True)

# ─── BROWSE MODE ─────────────────────────────────────────────────────────────
else:
    st.markdown('<div class="section-header">Browse by Dataset</div>', unsafe_allow_html=True)

    col1, col2, col3 = st.columns([2, 2, 3])
    with col1:
        dataset_num = st.selectbox(
            "Dataset",
            list(range(1, NUM_DATASETS + 1)),
            format_func=lambda x: f"Dataset {x}",
        )
    with col2:
        file_filter = st.text_input("Filter filenames", placeholder="e.g. EFTA027…")
    with col3:
        st.markdown(f"""
        <div style="padding-top: 1.8rem; font-size: 0.75rem; color: #3a4258;">
            📦 Bulk download:
            <a href="https://www.justice.gov/epstein/files/DataSet%20{dataset_num}.zip"
               target="_blank" style="color: #4d8cf5;">
               DataSet {dataset_num}.zip ↗
            </a>
        </div>
        """, unsafe_allow_html=True)

    # Page state for dataset browser
    browse_key = f"browse_page_{dataset_num}"
    if browse_key not in st.session_state:
        st.session_state[browse_key] = 0

    current_page = st.session_state[browse_key]

    with st.spinner(f"Loading Dataset {dataset_num}, page {current_page + 1}..."):
        data = get_dataset_files(dataset_num, page=current_page)

    if "error" in data:
        st.error(f"Failed to load: {data['error']}")
    else:
        files = data["files"]
        total_pages = data["pages"]

        if file_filter:
            files = [f for f in files if file_filter.lower() in f["filename"].lower()]

        st.markdown(f"""
        <div class="stats-bar">
            <span>DATASET <strong>{dataset_num}</strong></span>
            <span>FILES ON PAGE <strong>{len(files)}</strong></span>
            <span>PAGE <strong>{current_page + 1}</strong> / <strong>{total_pages}</strong></span>
        </div>
        """, unsafe_allow_html=True)

        if not files:
            st.markdown('<div class="empty-state"><div class="icon">📂</div>No files match your filter.</div>', unsafe_allow_html=True)
        else:
            # Render file list
            file_html = ""
            for f in files:
                file_html += f"""
                <div class="file-item">
                    <span class="fname">{f['filename']}</span>
                    <div>
                        <a href="{f['url']}" target="_blank">View ↗</a>
                        &nbsp;
                        <a href="{f['url']}" download>⬇</a>
                    </div>
                </div>
                """
            st.markdown(
                f'<div style="background:#0d0f14; border:1px solid #1e2230; border-radius:6px; overflow:hidden;">{file_html}</div>',
                unsafe_allow_html=True
            )

        # Pagination
        pcol1, _, pcol3 = st.columns([1, 3, 1])
        with pcol1:
            if current_page > 0:
                if st.button("← Prev page"):
                    st.session_state[browse_key] -= 1
                    st.rerun()
        with pcol3:
            if current_page < total_pages - 1:
                if st.button("Next page →"):
                    st.session_state[browse_key] += 1
                    st.rerun()
