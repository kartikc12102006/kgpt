/* =====================================================
   MY STUDY BOT V1
   PDF SEARCH + OCR + GOOGLE + BASIC CALCULATOR
   ===================================================== */


/* =====================================================
   GLOBAL VARIABLES
   ===================================================== */

let textbookPages = [];

let currentQuestion = "";

let lastSearchQuery = "";


/* =====================================================
   HTML ELEMENTS
   ===================================================== */

const pdfInput = document.getElementById("pdfInput");

const loadPdfBtn = document.getElementById("loadPdfBtn");

const pdfInfo = document.getElementById("pdfInfo");

const imageInput = document.getElementById("imageInput");

const ocrBtn = document.getElementById("ocrBtn");

const questionInput = document.getElementById("questionInput");

const searchBtn = document.getElementById("searchBtn");

const simplifyBtn = document.getElementById("simplifyBtn");

const googleBtn = document.getElementById("googleBtn");

const resultBox = document.getElementById("result");

const statusBox = document.getElementById("statusBox");

const ocrProgress = document.getElementById("ocrProgress");

const calculationInput =
    document.getElementById("calculationInput");

const calculateBtn =
    document.getElementById("calculateBtn");

const calculationResult =
    document.getElementById("calculationResult");


/* =====================================================
   STATUS FUNCTION
   ===================================================== */

function setStatus(message) {

    statusBox.textContent = message;

}


/* =====================================================
   PDF.JS SETUP
   ===================================================== */

let pdfjsLib = null;


/*
   Import PDF.js dynamically.
*/

async function loadPDFLibrary() {

    if (pdfjsLib) {
        return;
    }

    try {

        pdfjsLib = await import(
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
        );

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

    }

    catch (error) {

        console.error(error);

        setStatus(
            "❌ Could not load PDF reader."
        );

    }

}


/* =====================================================
   LOAD PDF BUTTON
   ===================================================== */

loadPdfBtn.addEventListener(
    "click",
    loadTextbook
);


/* =====================================================
   LOAD TEXTBOOK
   ===================================================== */

async function loadTextbook() {

    const file = pdfInput.files[0];

    if (!file) {

        alert(
            "Please select a PDF textbook first."
        );

        return;
    }


    setStatus(
        "📚 Loading textbook..."
    );


    await loadPDFLibrary();


    try {

        const arrayBuffer =
            await file.arrayBuffer();


        const pdf =
            await pdfjsLib.getDocument({
                data: arrayBuffer
            }).promise;


        textbookPages = [];


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            setStatus(
                `📖 Reading page ${pageNumber} of ${pdf.numPages}...`
            );


            const page =
                await pdf.getPage(pageNumber);


            const content =
                await page.getTextContent();


            const text =
                content.items
                    .map(item => item.str)
                    .join(" ");


            textbookPages.push({

                page: pageNumber,

                text: text

            });

        }


        pdfInfo.innerHTML = `

            <b>✅ Textbook loaded</b><br>

            File:
            ${escapeHTML(file.name)}
            <br>

            Pages:
            ${pdf.numPages}

        `;


        setStatus(
            "🟢 Textbook ready for searching."
        );

    }

    catch (error) {

        console.error(error);

        setStatus(
            "❌ Error reading PDF."
        );

        pdfInfo.textContent =
            "Could not read this PDF.";

    }

}


/* =====================================================
   OCR BUTTON
   ===================================================== */

ocrBtn.addEventListener(
    "click",
    readQuestion
);


/* =====================================================
   OCR IMAGE
   ===================================================== */

async function readQuestion() {

    const file = imageInput.files[0];


    if (!file) {

        alert(
            "Please take or upload a question image."
        );

        return;

    }


    setStatus(
        "🔍 Reading question image..."
    );


    ocrProgress.style.width = "0%";


    try {

        const result =
            await Tesseract.recognize(

                file,

                "eng",

                {

                    logger: function(info) {

                        if (
                            info.status ===
                            "recognizing text"
                        ) {

                            const progress =
                                Math.round(
                                    info.progress * 100
                                );

                            ocrProgress.style.width =
                                progress + "%";

                            setStatus(
                                `📝 OCR: ${progress}%`
                            );

                        }

                    }

                }

            );


        const text =
            result.data.text.trim();


        questionInput.value =
            cleanOCRText(text);


        currentQuestion =
            questionInput.value;


        setStatus(
            "✅ Question detected."
        );


        ocrProgress.style.width =
            "100%";


    }

    catch (error) {

        console.error(error);

        setStatus(
            "❌ OCR failed."
        );

        alert(
            "Could not read the image."
        );

    }

}


/* =====================================================
   CLEAN OCR TEXT
   ===================================================== */

function cleanOCRText(text) {

    return text

        .replace(/\r/g, "")

        .replace(/[ \t]+/g, " ")

        .replace(/\n{3,}/g, "\n\n")

        .trim();

}


/* =====================================================
   SEARCH BUTTON
   ===================================================== */

searchBtn.addEventListener(
    "click",
    searchTextbook
);


/* =====================================================
   SEARCH TEXTBOOK
   ===================================================== */

function searchTextbook() {

    const query =
        questionInput.value.trim();


    if (!query) {

        alert(
            "Please enter or scan a question."
        );

        return;

    }


    if (textbookPages.length === 0) {

        resultBox.innerHTML = `

            <div class="result-page">

                <h3>📚 No textbook loaded</h3>

                <p>
                    Upload a textbook PDF first.
                </p>

            </div>

        `;

        return;

    }


    currentQuestion = query;

    lastSearchQuery = query;


    setStatus(
        "🔎 Searching textbook..."
    );


    const results =
        findRelevantPages(query);


    displayResults(
        results,
        query
    );


    if (results.length > 0) {

        setStatus(
            `✅ Found ${results.length} relevant page(s).`
        );

    }

    else {

        setStatus(
            "⚠️ No strong textbook match found."
        );

    }

}


/* =====================================================
   FIND RELEVANT PAGES
   ===================================================== */

function findRelevantPages(query) {

    const keywords =
        extractKeywords(query);


    if (keywords.length === 0) {

        return [];

    }


    const results = [];


    for (
        const page of textbookPages
    ) {

        const lowerText =
            page.text.toLowerCase();


        let score = 0;


        for (
            const keyword of keywords
        ) {

            const occurrences =
                countOccurrences(
                    lowerText,
                    keyword
                );


            score += occurrences;

        }


        if (score > 0) {

            results.push({

                page: page.page,

                text: page.text,

                score: score

            });

        }

    }


    results.sort(
        (a, b) =>
            b.score - a.score
    );


    return results.slice(
        0,
        5
    );

}


/* =====================================================
   EXTRACT SEARCH KEYWORDS
   ===================================================== */

function extractKeywords(text) {

    const stopWords = new Set([

        "what",
        "is",
        "are",
        "the",
        "a",
        "an",
        "of",
        "to",
        "in",
        "on",
        "for",
        "and",
        "or",
        "explain",
        "define",
        "describe",
        "write",
        "give",
        "state",
        "with",
        "from",
        "how",
        "why",
        "which",
        "this",
        "that"

    ]);


    const words =
        text
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, " ")
            .split(/\s+/);


    const keywords =
        words.filter(

            word =>

                word.length >= 3 &&

                !stopWords.has(word)

        );


    return [
        ...new Set(keywords)
    ];

}


/* =====================================================
   COUNT WORD OCCURRENCES
   ===================================================== */

function countOccurrences(
    text,
    word
) {

    const regex =
        new RegExp(
            "\\b" +
            escapeRegex(word) +
            "\\b",
            "gi"
        );


    const matches =
        text.match(regex);


    return matches
        ? matches.length
        : 0;

}


/* =====================================================
   DISPLAY RESULTS
   ===================================================== */

function displayResults(
    results,
    query
) {

    if (results.length === 0) {

        resultBox.innerHTML = `

            <div class="result-page">

                <h3>
                    ❌ No answer found
                </h3>

                <p>
                    I couldn't find a strong
                    keyword match in your
                    uploaded textbook.
                </p>

                <p>
                    Try the Google Search button
                    below.
                </p>

            </div>

        `;

        return;

    }


    let html = "";


    results.forEach(
        result => {

            const snippet =
                createSnippet(
                    result.text,
                    query
                );


            html += `

                <div class="result-page">

                    <h3>
                        📄 Page ${result.page}
                    </h3>

                    <p>
                        ${highlightKeywords(
                            escapeHTML(snippet),
                            query
                        )}
                    </p>

                    <small>
                        Relevance score:
                        ${result.score}
                    </small>

                </div>

            `;

        }
    );


    resultBox.innerHTML =
        html;

}


/* =====================================================
   CREATE SNIPPET
   ===================================================== */

function createSnippet(
    text,
    query
) {

    const keywords =
        extractKeywords(query);


    if (keywords.length === 0) {

        return text.substring(
            0,
            1000
        );

    }


    let bestPosition = 0;

    let highestScore = 0;


    for (
        const keyword of keywords
    ) {

        const position =
            text
                .toLowerCase()
                .indexOf(keyword);


        if (position >= 0) {

            bestPosition =
                position;

            highestScore = 1;

            break;

        }

    }


    if (highestScore === 0) {

        return text.substring(
            0,
            1000
        );

    }


    const start =
        Math.max(
            0,
            bestPosition - 300
        );


    const end =
        Math.min(
            text.length,
            bestPosition + 1000
        );


    let snippet =
        text.substring(
            start,
            end
        );


    if (start > 0) {

        snippet =
            "... " + snippet;

    }


    if (end < text.length) {

        snippet +=
            " ...";

    }


    return snippet;

}


/* =====================================================
   HIGHLIGHT KEYWORDS
   ===================================================== */

function highlightKeywords(
    text,
    query
) {

    const keywords =
        extractKeywords(query);


    let result = text;


    keywords.forEach(
        keyword => {

            const regex =
                new RegExp(
                    "(" +
                    escapeRegex(keyword) +
                    ")",
                    "gi"
                );


            result =
                result.replace(
                    regex,
                    '<span class="highlight">$1</span>'
                );

        }
    );


    return result;

}


/* =====================================================
   GOOGLE BUTTON
   ===================================================== */

googleBtn.addEventListener(
    "click",
    searchGoogle
);


/* =====================================================
   GOOGLE SEARCH
   ===================================================== */

function searchGoogle() {

    const query =
        questionInput.value.trim();


    if (!query) {

        alert(
            "Please enter a question first."
        );

        return;

    }


    const url =
        "https://www.google.com/search?q=" +
        encodeURIComponent(query);


    window.open(
        url,
        "_blank"
    );

}


/* =====================================================
   SIMPLIFY BUTTON
   ===================================================== */

simplifyBtn.addEventListener(
    "click",
    simplifyText
);


/* =====================================================
   BASIC SIMPLIFIER
   ===================================================== */

function simplifyText() {

    let text =
        questionInput.value.trim();


    if (!text) {

        alert(
            "Enter some text first."
        );

        return;

    }


    /*
       This is intentionally NOT AI.

       It performs basic:
       - sentence splitting
       - cleanup
       - bullet formatting
       - keyword extraction
    */


    const sentences =
        text
            .replace(/\n+/g, " ")
            .split(/[.!?]+/)
            .map(
                sentence =>
                    sentence.trim()
            )
            .filter(
                sentence =>
                    sentence.length > 0
            );


    const keywords =
        extractKeywords(text);


    let output =
        "<h3>✨ Simplified Version</h3>";


    if (sentences.length > 0) {

        output += "<ul>";


        sentences.forEach(
            sentence => {

                output +=
                    `<li>${escapeHTML(
                        sentence
                    )}</li>`;

            }
        );


        output += "</ul>";

    }


    if (keywords.length > 0) {

        output += `

            <p>
                <b>🔑 Important keywords:</b>
                ${keywords
                    .map(
                        k =>
                            escapeHTML(k)
                    )
                    .join(", ")}
            </p>

        `;

    }


    resultBox.innerHTML =
        output;


    setStatus(
        "✨ Text simplified using basic rules."
    );

}


/* =====================================================
   BASIC CALCULATOR
   ===================================================== */

calculateBtn.addEventListener(
    "click",
    calculateExpression
);


/* =====================================================
   CALCULATE
   ===================================================== */

function calculateExpression() {

    const expression =
        calculationInput.value.trim();


    if (!expression) {

        alert(
            "Enter a calculation."
        );

        return;

    }


    /*
       Only allow safe mathematical
       characters.

       Allowed:
       numbers
       + - * / %
       decimal points
       parentheses
    */


    if (
        !/^[0-9+\-*/%.()\s]+$/.test(
            expression
        )
    ) {

        calculationResult.innerHTML =
            "❌ Only basic mathematical expressions are allowed.";

        return;

    }


    try {

        /*
           JavaScript evaluates the
           basic expression.
        */

        const answer =
            Function(
                '"use strict"; return (' +
                expression +
                ')'
            )();


        if (
            typeof answer !== "number" ||
            !Number.isFinite(answer)
        ) {

            throw new Error(
                "Invalid calculation"
            );

        }


        calculationResult.innerHTML = `

            <div>
                Expression:
                <br>
                <b>${escapeHTML(
                    expression
                )}</b>
            </div>

            <br>

            <div>
                Answer:
                <br>
                <b>${answer}</b>
            </div>

        `;

    }

    catch (error) {

        calculationResult.innerHTML =
            "❌ Invalid calculation.";

    }

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function escapeHTML(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   ESCAPE REGEX
   ===================================================== */

function escapeRegex(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


/* =====================================================
   INITIAL STATUS
   ===================================================== */

setStatus(
    "🟢 My Study Bot V1 is ready."
);
