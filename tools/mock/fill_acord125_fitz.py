# fill_acords_exact.py  (updated to avoid constants)
import fitz  # PyMuPDF
from faker import Faker
from datetime import date, timedelta
import os, random, re

TEMPLATE = "Acord-125-Commercial-Insurance-Application.pdf"
OUT_DIR  = "out"
os.makedirs(OUT_DIR, exist_ok=True)

fake = Faker("en_US")

# Numeric widget type codes (same legend as inspector)
WTYPE_CHECKBOX = 2
WTYPE_TEXT     = 7

def money(lo, hi):
    return f"${random.randrange(lo, hi):,}"

def fmt_phone():
    return f"({random.randint(201,989)}) {random.randint(200,999)}-{random.randint(1000,9999)}"

def today():
    return date.today()

def plus_year(d):
    try:
        return d.replace(year=d.year + 1)
    except ValueError:
        return d + (date(d.year + 1, 3, 1) - date(d.year, 3, 1))

def mk_company_domain(name:str) -> str:
    return "https://" + re.sub(r"[^a-z0-9]+", "", name.lower()) + ".com"

INDUSTRIES = [
    ("Construction Contractor", "236115"),
    ("Restaurant", "722511"),
    ("Retail Clothing Store", "448140"),
    ("Medical Office", "621111"),
    ("IT Consulting Firm", "541512"),
    ("Real Estate Agency", "531210"),
    ("Trucking & Logistics", "484110"),
    ("Manufacturing", "333120"),
    ("Landscaping Services", "561730"),
    ("Non-Profit Organization", "813110"),
]

ENTITY_TO_FIELD = {
    "Corporation": "F[0].P1[0].NamedInsured_LegalEntity_CorporationIndicator_A[0]",
    "Individual":  "F[0].P1[0].NamedInsured_LegalEntity_IndividualIndicator_A[0]",
    "JointVenture":"F[0].P1[0].NamedInsured_LegalEntity_JointVentureIndicator_A[0]",
    "LLC":         "F[0].P1[0].NamedInsured_LegalEntity_LimitedLiabilityCorporationIndicator_A[0]",
    "NotForProfit":"F[0].P1[0].NamedInsured_LegalEntity_NotForProfitIndicator_A[0]",
    "Partnership": "F[0].P1[0].NamedInsured_LegalEntity_PartnershipIndicator_A[0]",
    "SubS":        "F[0].P1[0].NamedInsured_LegalEntity_SubchapterSCorporationIndicator_A[0]",
    "Trust":       "F[0].P1[0].NamedInsured_LegalEntity_TrustIndicator_A[0]",
}

LOB_CHECK_PREMIUM = [
    ("F[0].P1[0].Policy_LineOfBusiness_CommercialGeneralLiability_A[0]", "F[0].P1[0].GeneralLiabilityLineOfBusiness_TotalPremiumAmount_A[0]", (1000,6000)),
    ("F[0].P1[0].Policy_LineOfBusiness_CommercialProperty_A[0]",         "F[0].P1[0].CommercialPropertyLineOfBusiness_PremiumAmount_A[0]",    (1500,8000)),
    ("F[0].P1[0].Policy_LineOfBusiness_CommercialInlandMarineIndicator_A[0]", "F[0].P1[0].CommercialInlandMarineLineOfBusiness_PremiumAmount_A[0]", (500,4000)),
    ("F[0].P1[0].Policy_LineOfBusiness_CrimeIndicator_A[0]",             "F[0].P1[0].CrimeLineOfBusiness_PremiumAmount_A[0]",                 (300,2000)),
    ("F[0].P1[0].Policy_LineOfBusiness_UmbrellaIndicator_A[0]",          "F[0].P1[0].CommercialUmbrellaLineOfBusiness_PremiumAmount_A[0]",    (800,4000)),
    ("F[0].P1[0].Policy_LineOfBusiness_CyberAndPrivacy_A[0]",            "F[0].P1[0].CyberAndPrivacyLineOfBusiness_PremiumAmount_A[0]",       (600,3500)),
]

def build_mock(i:int):
    biz, naics = INDUSTRIES[i % len(INDUSTRIES)]
    eff = today()
    exp = plus_year(eff)

    company = fake.company()
    street = fake.street_address()
    city   = fake.city()
    state  = fake.state_abbr()
    zipc   = fake.zipcode()

    ent = random.choice(["Corporation", "LLC", "Partnership", "SubS", "NotForProfit", "Individual", "Trust", "JointVenture"])

    losses = []
    for _ in range(random.choice([0,0,1,2])):
        occ = eff - timedelta(days=random.randint(400, 1800))
        claim = occ + timedelta(days=random.randint(5,60))
        losses.append({
            "occ": occ.strftime("%m/%d/%Y"),
            "lob": random.choice(["Property","General Liability","Automobile"]),
            "desc": random.choice(["Minor water damage at premises","Slip-and-fall claim","Small theft incident","Low-speed vehicle collision"]),
            "claim": claim.strftime("%m/%d/%Y"),
            "paid": f"${random.randint(1000,15000):,}",
            "res":  f"${random.randint(0,7000):,}",
            "subro": random.choice(["Y","N"]),
            "open": random.choice(["Y","N"]),
        })

    data = {
        # Page 1 - producer / policy / named insured
        "F[0].P1[0].Form_CompletionDate_A[0]": eff.strftime("%m/%d/%Y"),
        "F[0].P1[0].Producer_FullName_A[0]": f"{fake.company()} Insurance Agency",
        "F[0].P1[0].Producer_MailingAddress_LineOne_A[0]": fake.street_address(),
        "F[0].P1[0].Producer_MailingAddress_LineTwo_A[0]": "",
        "F[0].P1[0].Producer_MailingAddress_CityName_A[0]": fake.city(),
        "F[0].P1[0].Producer_MailingAddress_StateOrProvinceCode_A[0]": fake.state_abbr(),
        "F[0].P1[0].Producer_MailingAddress_PostalCode_A[0]": fake.zipcode(),
        "F[0].P1[0].Producer_ContactPerson_FullName_A[0]": fake.name(),
        "F[0].P1[0].Producer_ContactPerson_PhoneNumber_A[0]": fmt_phone(),
        "F[0].P1[0].Producer_FaxNumber_A[0]": fmt_phone(),
        "F[0].P1[0].Producer_ContactPerson_EmailAddress_A[0]": fake.company_email(),
        "F[0].P1[0].Insurer_ProducerIdentifier_A[0]": str(random.randint(100000,999999)),
        "F[0].P1[0].Insurer_SubProducerIdentifier_A[0]": str(random.randint(1000,9999)),
        "F[0].P1[0].Producer_CustomerIdentifier_A[0]": str(random.randint(10_000, 999_999)),
        "F[0].P1[0].Insurer_FullName_A[0]": fake.company(),
        "F[0].P1[0].Insurer_NAICCode_A[0]": str(random.randint(10000, 99999)),
        "F[0].P1[0].Insurer_ProductDescription_A[0]": "Commercial Package",
        "F[0].P1[0].Insurer_ProductCode_A[0]": "CPP",
        "F[0].P1[0].Policy_PolicyNumberIdentifier_A[0]": f"NEW-{random.randint(1000000,9999999)}",
        "F[0].P1[0].Policy_Status_QuoteIndicator_A[0]": True,
        "F[0].P1[0].Policy_Status_IssueIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_RenewIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_BoundIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_ChangeIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_CancelIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_EffectiveDate_A[0]": eff.strftime("%m/%d/%Y"),
        "F[0].P1[0].Policy_Status_EffectiveTime_A[0]": "12:01",
        "F[0].P1[0].Policy_Status_EffectiveTimeAMIndicator_A[0]": False,
        "F[0].P1[0].Policy_Status_EffectiveTimePMIndicator_A[0]": True,
        "F[0].P1[0].Policy_EffectiveDate_A[0]": eff.strftime("%m/%d/%Y"),
        "F[0].P1[0].Policy_ExpirationDate_A[0]": plus_year(eff).strftime("%m/%d/%Y"),
        "F[0].P1[0].Policy_Payment_DirectBillIndicator_A[0]": True,
        "F[0].P1[0].Policy_Payment_ProducerBillIndicator_A[0]": False,
        "F[0].P1[0].Policy_Payment_PaymentScheduleCode_A[0]": random.choice(["AN","QT","MO"]),
        "F[0].P1[0].Policy_PaymentMethod_MethodDescription_A[0]": random.choice(["ACH","Check","Credit Card"]),
        "F[0].P1[0].Policy_Audit_FrequencyCode_A[0]": random.choice(["AN","QT","SEMI","MO"]),
        "F[0].P1[0].Policy_Payment_DepositAmount_A[0]": money(500, 2500),
        "F[0].P1[0].Policy_Payment_MinimumPremiumAmount_A[0]": money(500, 1500),
        "F[0].P1[0].Policy_Payment_EstimatedTotalAmount_A[0]": money(3000, 19000),

        "F[0].P1[0].NamedInsured_FullName_A[0]": company,
        "F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]": street,
        "F[0].P1[0].NamedInsured_MailingAddress_LineTwo_A[0]": "",
        "F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]": city,
        "F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]": state,
        "F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]": zipc,
        "F[0].P1[0].NamedInsured_GeneralLiabilityCode_A[0]": str(random.randint(10000,99999)),
        "F[0].P1[0].NamedInsured_SICCode_A[0]": str(random.randint(1000,9999)),
        "F[0].P1[0].NamedInsured_NAICSCode_A[0]": naics,
        "F[0].P1[0].NamedInsured_TaxIdentifier_A[0]": f"{random.randint(10,99)}-{random.randint(1000000,9999999)}",
        "F[0].P1[0].NamedInsured_Primary_PhoneNumber_A[0]": fmt_phone(),
        "F[0].P1[0].NamedInsured_Primary_WebsiteAddress_A[0]": mk_company_domain(company),
        "F[0].P1[0].NamedInsured_LegalEntity_MemberManagerCount_A[0]": str(random.randint(1, 5)),
        "F[0].P1[0].NamedInsured_LegalEntity_OtherDescription_A[0]": "",

        # Page 2
        "F[0].P2[0].CommercialStructure_PhysicalAddress_LineOne_A[0]": street,
        "F[0].P2[0].CommercialStructure_PhysicalAddress_LineTwo_A[0]": "",
        "F[0].P2[0].CommercialStructure_PhysicalAddress_CityName_A[0]": city,
        "F[0].P2[0].CommercialStructure_PhysicalAddress_CountyName_A[0]": fake.city() + " County",
        "F[0].P2[0].CommercialStructure_PhysicalAddress_StateOrProvinceCode_A[0]": state,
        "F[0].P2[0].CommercialStructure_PhysicalAddress_PostalCode_A[0]": zipc,
        "F[0].P2[0].CommercialStructure_RiskLocation_InsideCityLimitsIndicator_A[0]": True,
        "F[0].P2[0].CommercialStructure_RiskLocation_OutsideCityLimitsIndicator_A[0]": False,
        "F[0].P2[0].CommercialStructure_RiskLocation_OtherIndicator_A[0]": False,
        "F[0].P2[0].CommercialStructure_RiskLocation_OtherDescription_A[0]": "",
        "F[0].P2[0].CommercialStructure_InsuredInterest_OwnerIndicator_A[0]": random.choice([True, False]),
        "F[0].P2[0].CommercialStructure_InsuredInterest_TenantIndicator_A[0]": random.choice([True, False]),
        "F[0].P2[0].CommercialStructure_InsuredInterest_OtherIndicator_A[0]": False,
        "F[0].P2[0].CommercialStructure_InsuredInterest_OtherDescription_A[0]": "",
        "F[0].P2[0].BusinessInformation_FullTimeEmployeeCount_A[0]": str(random.randint(3, 120)),
        "F[0].P2[0].BusinessInformation_PartTimeEmployeeCount_A[0]": str(random.randint(0, 50)),
        "F[0].P2[0].CommercialStructure_AnnualRevenueAmount_A[0]": money(250000, 8000000),
        "F[0].P2[0].BuildingOccupancy_OccupiedArea_A[0]": str(random.randint(1500, 25000)),
        "F[0].P2[0].BuildingOccupancy_OpenToPublicArea_A[0]": str(random.randint(0, 8000)),
        "F[0].P2[0].Construction_BuildingArea_A[0]": str(random.randint(2000, 35000)),
        "F[0].P2[0].BuildingOccupancy_OperationsDescription_A[0]": f"{biz} – typical operations, no unusual hazards.",
        "F[0].P2[0].NamedInsured_BusinessStartDate_A[0]": (eff - timedelta(days=random.randint(365, 365*15))).strftime("%m/%d/%Y"),
        "F[0].P2[0].CommercialPolicy_OperationsDescription_A[0]": f"{biz}: primary operations include {random.choice(['sales','service','installation','consulting'])}. Safety program in place.",

        # Page 3
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_SafetyManualIndicator_A[0]": random.choice([True, False]),
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_SafetyPositionIndicator_B[0]": random.choice([True, False]),
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_MonthlyMeetingsIndicator_B[0]": random.choice([True, False]),
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_OSHAIndicator_B[0]": random.choice([True, False]),
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_OtherIndicator_B[0]": False,
        "F[0].P3[0].CommercialPolicy_FormalSafetyProgram_OtherDescription_B[0]": "",
        "F[0].P3[0].CommercialPolicy_RemarkText_A[0]": "No unusual exposures reported. Prior carriers listed below.",

        # Page 3 prior coverage (examples)
        "F[0].P3[0].PriorCoverage_PolicyYear_A[0]": str(eff.year - 1),
        "F[0].P3[0].PriorCoverage_GeneralLiability_InsurerFullName_A[0]": fake.company(),
        "F[0].P3[0].PriorCoverage_GeneralLiability_PolicyNumberIdentifier_A[0]": f"GL-{random.randint(100000,999999)}",
        "F[0].P3[0].PriorCoverage_GeneralLiability_TotalPremiumAmount_A[0]": money(900, 5000),
        "F[0].P3[0].PriorCoverage_GeneralLiability_EffectiveDate_A[0]": (eff.replace(year=eff.year-1)).strftime("%m/%d/%Y"),
        "F[0].P3[0].PriorCoverage_GeneralLiability_ExpirationDate_A[0]": (plus_year(eff).replace(year=eff.year)).strftime("%m/%d/%Y"),
        "F[0].P3[0].PriorCoverage_Property_InsurerFullName_A[0]": fake.company(),
        "F[0].P3[0].PriorCoverage_Property_PolicyNumberIdentifier_A[0]": f"PR-{random.randint(100000,999999)}",
        "F[0].P3[0].PriorCoverage_Property_TotalPremiumAmount_A[0]": money(1200, 7000),
        "F[0].P3[0].PriorCoverage_Property_EffectiveDate_A[0]": (eff.replace(year=eff.year-1)).strftime("%m/%d/%Y"),
        "F[0].P3[0].PriorCoverage_Property_ExpirationDate_A[0]": (plus_year(eff).replace(year=eff.year)).strftime("%m/%d/%Y"),

        # Page 4 header & signatures
        "F[0].P4[0].LossHistory_InformationYearCount_A[0]": "5",
        "F[0].P4[0].LossHistory_TotalAmount_A[0]": "",
        "F[0].P4[0].Producer_AuthorizedRepresentative_FullName_A[0]": fake.name(),
        "F[0].P4[0].Producer_StateLicenseIdentifier_A[0]": str(random.randint(1000000, 9999999)),
        "F[0].P4[0].Producer_NationalIdentifier_A[0]": str(random.randint(100000000, 999999999)),
        "F[0].P4[0].NamedInsured_Signature_A[0]": f"/s/ {fake.name()}",
        "F[0].P4[0].NamedInsured_SignatureDate_A[0]": eff.strftime("%m/%d/%Y"),
        "F[0].P4[0].NamedInsured_Initials_A[0]": "".join(w[0] for w in company.split() if w).upper()[:3],
    }
    return data, ent, losses

def _set_checkbox(widget, on: bool):
    try:
        widget.field_value = "Yes" if on else "Off"
        widget.update()
    except RuntimeError:
        # Orphan / unbound anno – ignore
        pass
    except Exception:
        pass

def _set_text(widget, value: str):
    try:
        widget.field_value = "" if value is None else str(value)
        widget.update()
    except RuntimeError:
        # Orphan / unbound anno – ignore
        pass
    except Exception:
        pass

def _apply_to_field(doc, field_name: str, value, force_checkbox: bool | None = None):
    """
    Find *fresh* widget instances by name and set value (text or checkbox).
    Returns True if at least one widget was updated.
    """
    if not field_name:
        return False
    updated = False
    fname = field_name.strip()

    for pno in range(len(doc)):
        page = doc[pno]
        widgets = page.widgets() or []
        for w in widgets:
            if (w.field_name or "").strip() != fname:
                continue

            is_checkbox = (force_checkbox is True) or (force_checkbox is None and w.field_type == WTYPE_CHECKBOX)
            if is_checkbox:
                truthy = str(value).strip().upper() in ("Y","YES","TRUE","ON","1")
                _set_checkbox(w, truthy)
            else:
                _set_text(w, value)
            updated = True
    return updated

def _apply_many(doc, mapping: dict, checkbox_names: set[str] | None = None):
    """
    mapping: { field_name -> value }
    checkbox_names: optional set of field_names that must be treated as checkboxes.
    """
    checkbox_names = checkbox_names or set()
    for fname, val in mapping.items():
        force_cb = (fname in checkbox_names)
        _apply_to_field(doc, fname, val, force_checkbox=force_cb)

def fill_fields(doc, data_map: dict, entity_key: str, losses: list):
    # 1) Basic mapped values (text + checkboxes in data_map)
    #    We'll treat *only* known checkbox names as forced checkboxes if you want,
    #    but for most ACORDs the widget type is accurate, so force not required.
    _apply_many(doc, data_map)

    # 2) Entity checkboxes: set selected one True, all others False
    for ent, f in ENTITY_TO_FIELD.items():
        _apply_to_field(doc, f, ent == entity_key, force_checkbox=True)

    # 3) Lines of business: pick several and set premiums
    for check_name, prem_name, (lo, hi) in LOB_CHECK_PREMIUM:
        on = random.random() < 0.75
        _apply_to_field(doc, check_name, on, force_checkbox=True)
        _apply_to_field(doc, prem_name, (f"${random.randrange(lo, hi):,}" if on else ""))

    # 4) Loss history (Page 4)
    total_paid = 0

    def set_by_name(fname, val, checkbox=False):
        _apply_to_field(doc, fname, val, force_checkbox=checkbox)

    rows = [
        ("A", "F[0].P4[0].LossHistory_OccurrenceDate_A[0]",
               "F[0].P4[0].LossHistory_LineOfBusiness_A[0]",
               "F[0].P4[0].LossHistory_OccurrenceDescription_A[0]",
               "F[0].P4[0].LossHistory_ClaimDate_A[0]",
               "F[0].P4[0].LossHistory_PaidAmount_A[0]",
               "F[0].P4[0].LossHistory_ReservedAmount_A[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_SubrogationCode_A[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_OpenCode_A[0]"),
        ("B", "F[0].P4[0].LossHistory_OccurrenceDate_B[0]",
               "F[0].P4[0].LossHistory_LineOfBusiness_B[0]",
               "F[0].P4[0].LossHistory_OccurrenceDescription_B[0]",
               "F[0].P4[0].LossHistory_ClaimDate_B[0]",
               "F[0].P4[0].LossHistory_PaidAmount_B[0]",
               "F[0].P4[0].LossHistory_ReservedAmount_B[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_SubrogationCode_B[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_OpenCode_B[0]"),
        ("C", "F[0].P4[0].LossHistory_OccurrenceDate_C[0]",
               "F[0].P4[0].LossHistory_LineOfBusiness_C[0]",
               "F[0].P4[0].LossHistory_OccurrenceDescription_C[0]",
               "F[0].P4[0].LossHistory_ClaimDate_C[0]",
               "F[0].P4[0].LossHistory_PaidAmount_C[0]",
               "F[0].P4[0].LossHistory_ReservedAmount_C[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_SubrogationCode_C[0]",
               "F[0].P4[0].LossHistory_ClaimStatus_OpenCode_C[0]"),
    ]

    if not losses:
        set_by_name("F[0].P4[0].LossHistory_NoPriorLossesIndicator_A[0]", True, checkbox=True)
    else:
        import re as _re
        for i, L in enumerate(losses[:3]):
            _, occ, lob, desc, clm, paid, resv, subro, open_ = rows[i]
            set_by_name(occ,  L["occ"])
            set_by_name(lob,  L["lob"])
            set_by_name(desc, L["desc"])
            set_by_name(clm,  L["claim"])
            set_by_name(paid, L["paid"])
            set_by_name(resv, L["res"])
            set_by_name(subro, L["subro"], checkbox=True)
            set_by_name(open_,  L["open"],  checkbox=True)
            try:
                total_paid += int(_re.sub(r"[^\d]", "", L["paid"]) or "0")
            except Exception:
                pass
        if total_paid:
            set_by_name("F[0].P4[0].LossHistory_TotalAmount_A[0]", f"${total_paid:,}")

    # 5) Final flatten (fresh widgets per page to avoid orphaned refs)
    for pno in range(len(doc)):
        page = doc[pno]
        for w in (page.widgets() or []):
            try:
                w.update()
                w.flatten()
            except RuntimeError:
                # orphan widget: ignore
                pass
            except Exception:
                pass

def main():
    for i in range(10):
        data_map, entity_key, losses = build_mock(i)
        out_pdf = os.path.join(OUT_DIR, f"ACORD_125_Sample_{i+1}.pdf")
        with fitz.open(TEMPLATE) as doc:
            fill_fields(doc, data_map, entity_key, losses)
            doc.save(out_pdf, deflate=True, incremental=False, garbage=4, clean=True)
        print(f"Wrote: {out_pdf}")

if __name__ == "__main__":
    main()
