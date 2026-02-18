import fitz
import re
import os
import json

# ==================================================
# CONFIGURATION
# ==================================================

PDF_DIR = r"C:\Users\phadt\Documents\IST440W-main\textExtraction\manuals"
OUTPUT_JSON = os.path.join(PDF_DIR, "structured_results.json")

OIL_PATTERN = r"\b\d{1,2}W-?\d{2}\b"
ENGINE_PATTERN = r"\b\d\.\dL\b|\bV6\b|\bV8\b|\bI4\b|\b4-cylinder\b|\b6-cylinder\b"

COMMON_MAKES = [
    "Honda", "Toyota", "Ford", "Chevrolet",
    "Nissan", "Hyundai", "BMW", "Mercedes",
    "Volkswagen", "Kia", "Mazda", "Subaru",
    "Buick"
]

# ==================================================
# OCR CLEANING
# ==================================================

def clean_ocr(text):
    text = re.sub(r"\bOW-(\d{2})\b", r"0W-\1", text)
    text = re.sub(r"\b1OW-(\d{2})\b", r"10W-\1", text)
    text = re.sub(r"\b(\d)O(W-?\d{2})\b", r"\g<1>0\g<2>", text)
    return text


# ==================================================
# TEMPERATURE CONVERSION
# ==================================================

def f_to_c(f):
    return round((f - 32) * 5 / 9)


# ==================================================
# VEHICLE EXTRACTION
# ==================================================

def extract_vehicle_info(full_text):

    year = None
    make = None
    model = None
    engine = None

    # YEAR
    year_match = re.search(r"\b(19|20)\d{2}\b", full_text)
    if year_match:
        year = int(year_match.group())

    # Header Pattern (Year Make Model OR Year Model Something)
    header_match = re.search(
        r"\b(19|20)\d{2}\s+([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z0-9\-]+)",
        full_text
    )

    if header_match:
        second_word = header_match.group(2)
        third_word = header_match.group(3)

        if second_word in COMMON_MAKES:
            make = second_word
            model = third_word
        else:
            model = second_word

    # Separate manufacturer detection
    if not make:
        make_match = re.search(
            r"\b(" + "|".join(COMMON_MAKES) + r")\b",
            full_text
        )
        if make_match:
            make = make_match.group(0)

    # ENGINE
    engine_match = re.search(ENGINE_PATTERN, full_text, re.IGNORECASE)
    if engine_match:
        engine = engine_match.group(0)

    # Display name
    display_name = None
    if year and make and model:
        display_name = f"{year} {make} {model}"
        if engine:
            display_name += f" {engine}"

    return {
        "year": year,
        "make": make,
        "model": model,
        "engine": engine,
        "displayName": display_name
    }


# ==================================================
# TEMPERATURE EXTRACTION
# ==================================================

def extract_temperature(text):

    match = re.search(
        r"(below|above|under|over)\s*(-?\d+)\s*°?\s*F",
        text,
        re.IGNORECASE
    )

    if match:
        direction = match.group(1).lower()
        f_value = int(match.group(2))
        c_value = f_to_c(f_value)

        return {
            direction: {
                "value": c_value,
                "unit": "degreeCelsius"
            }
        }

    return "normal"


# ==================================================
# OIL CLASSIFICATION
# ==================================================

def classify(context):

    lower = context.lower()

    if re.search(r"(do not use|avoid|never use)", lower):
        return False

    if any(keyword in lower for keyword in [
        "is recommended",
        "recommended",
        "consider using",
        "should use",
        "is best",
        "best for"
    ]):
        return True

    return None


# ==================================================
# MAIN PDF PROCESSOR
# ==================================================

def process_pdfs():

    grouped = {}

    for file in os.listdir(PDF_DIR):

        if not file.lower().endswith(".pdf"):
            continue

        path = os.path.join(PDF_DIR, file)
        oil_data = {}

        with fitz.open(path) as doc:

            full_text = ""
            for page in doc:
                full_text += clean_ocr(page.get_text("text")) + "\n"

            vehicle_info = extract_vehicle_info(full_text)
            lines = full_text.split("\n")

            for i, line in enumerate(lines):

                oils = re.findall(OIL_PATTERN, line, re.IGNORECASE)
                if not oils:
                    continue

                context = " ".join(lines[max(0, i-3):i+4])
                temp = extract_temperature(context)
                rec = classify(context)

                if rec is None:
                    continue

                for oil in oils:

                    oil = oil.upper()
                    if "-" not in oil:
                        oil = oil.replace("W", "W-")

                    oil_data[oil] = {
                        "recommended": rec,
                        "temperature_condition": temp
                    }

        oil_list = []

        for oil, data in oil_data.items():
            oil_list.append({
                "oil_type": oil,
                "recommended": data["recommended"],
                "temperature_condition": data["temperature_condition"]
            })

        grouped[file] = {
            "Vehicle": vehicle_info,
            "oil_recommendations": oil_list
        }

    return grouped


# ==================================================
# RUN SCRIPT
# ==================================================

if __name__ == "__main__":

    results = process_pdfs()

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)

    print("JSON successfully saved.")
