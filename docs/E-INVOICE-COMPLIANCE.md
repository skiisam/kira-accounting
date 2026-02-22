# LHDN E-Invoice (MyInvois) Compliance Guide

## Overview

The Lembaga Hasil Dalam Negeri Malaysia (LHDNM) has implemented e-Invoice to digitalize Malaysia's business ecosystem and enhance tax administration efficiency. This aligns with Malaysia's 12th and 13th Malaysia Plans (RMK-12/RMK-13).

E-Invoice enables near real-time validation and storage of transactions for:
- **B2B** (Business-to-Business)
- **B2C** (Business-to-Consumer)
- **B2G** (Business-to-Government)

## Implementation Timeline

| Phase | Annual Turnover | Mandatory Date |
|-------|----------------|----------------|
| Phase 1 | > RM100 million | 1 August 2024 |
| Phase 2 | > RM25 million to ≤ RM100 million | 1 January 2025 |
| Phase 3 | All remaining taxpayers | 1 July 2025 |

## System Architecture

### Environment URLs

| Environment | Portal | System API | Identity Service |
|-------------|--------|------------|------------------|
| **Production** | myinvois.hasil.gov.my | api.myinvois.hasil.gov.my | api.myinvois.hasil.gov.my |
| **Sandbox** | preprod.myinvois.hasil.gov.my | preprod-api.myinvois.hasil.gov.my | preprod-api.myinvois.hasil.gov.my |

### Integration Components

1. **System Integration** - RESTful APIs for document submission
2. **Notifications Management** - Event notifications to configured channels
3. **Taxpayer Identity Management** - Digital profile management via web interface

## Document Types Supported

| Type Code | Document Type |
|-----------|---------------|
| 01 | Invoice |
| 02 | Credit Note |
| 03 | Debit Note |
| 04 | Refund Note |
| 11 | Self-Billed Invoice |
| 12 | Self-Billed Credit Note |
| 13 | Self-Billed Debit Note |
| 14 | Self-Billed Refund Note |

## Mandatory Fields

### Supplier Information (Issuer)

| Field | Description | Validation |
|-------|-------------|------------|
| **TIN** | Tax Identification Number | Required, validated against LHDNM records |
| **BRN** | Business Registration Number | Required for non-individuals |
| **Name** | Supplier name | Max 300 characters |
| **Address** | Full address (Line 1-3, City, State, Postal Code, Country) | Line max 150 chars, City max 50 chars |
| **Phone** | Contact number | Min 8, max 20 characters, optional + prefix |
| **Email** | Contact email | RFC 5321/5322 format, max 320 characters |
| **SST Number** | Sales & Service Tax registration | Max 35 chars, allows 'NA' |
| **TTX Number** | Tourism Tax registration | Max 17 chars, allows 'NA' |

### Buyer Information

| Field | Description | Validation |
|-------|-------------|------------|
| **TIN** | Tax Identification Number | Required for B2B |
| **BRN/ID** | Registration/Identification | Required |
| **Name** | Buyer name | Max 300 characters |
| **Address** | Full address | Same validation as supplier |
| **Phone** | Contact number | Same validation as supplier |
| **Email** | Contact email | Same validation as supplier |

### Invoice Header

| Field | Description | Required |
|-------|-------------|----------|
| **Invoice Code/Number** | Unique internal identifier | Yes |
| **Invoice Date & Time** | UTC format (ISO 8601) | Yes |
| **Invoice Type** | Document type code (01-14) | Yes |
| **Currency Code** | ISO 4217 currency code | Yes |
| **Exchange Rate** | Rate to MYR if foreign currency | Conditional |

### Invoice Line Items

| Field | Description | Required |
|-------|-------------|----------|
| **Classification Code** | Product/Service classification | Yes |
| **Description** | Item description | Yes |
| **Quantity** | Item quantity | Yes |
| **Unit Price** | Price per unit | Yes |
| **Tax Type** | Tax classification code | Yes |
| **Tax Rate** | Applicable tax rate | Yes |
| **Tax Amount** | Calculated tax | Yes |
| **Total Amount** | Line total excluding tax | Yes |

### Totals

| Field | Description | Required |
|-------|-------------|----------|
| **Subtotal** | Sum of line totals | Yes |
| **Tax Total** | Sum of all taxes | Yes |
| **Discount** | Total discount applied | Conditional |
| **Net Total** | Final payable amount | Yes |

## Digital Signature Requirements

### Certificate Requirements

E-Invoices must be digitally signed using X.509 certificates from Malaysian Certificate Authorities (CAs). The certificate must include:

1. **Distinguished Name Elements:**
   - Common Name (CN): Company/organization name
   - Country (C): "MY"
   - Organization (O): Company name
   - Organization Identifier: TIN (e.g., "C20830570210")
   - Serial Number: Business Registration Number

2. **Key Usage:**
   - Non-Repudiation (40) - **Required**
   - Document Signing (1.3.6.1.4.1.311.10.3.12) - **Required**

### Approved Certificate Authorities

Certificates must be obtained from MCMC-approved CAs:
- [MCMC List of Licensees](https://www.mcmc.gov.my/en/sectors/digital-signature/list-of-licensees)

### Signature Algorithm

- **Standard**: XAdES (XML Advanced Electronic Signature)
- **Hashing**: SHA-256
- **Signature**: RSA
- **Format**: Enveloped signature in UBL 2.1 extension

## API Workflow

### 1. Authentication

```
POST /connect/token
Content-Type: application/x-www-form-urlencoded

client_id={clientId}&client_secret={clientSecret}&grant_type=client_credentials&scope=InvoicingAPI
```

**Note:** Access tokens are valid for 60 minutes. Reuse tokens instead of generating new ones for each request.

### 2. Validate TIN (Optional but Recommended)

```
GET /api/v1.0/taxpayer/validate/{tin}?idType={idType}&idValue={idValue}
```

### 3. Submit Document

```
POST /api/v1.0/documentsubmissions
Content-Type: application/json

{
  "documents": [
    {
      "format": "JSON",
      "documentHash": "{SHA256_BASE64_HASH}",
      "codeNumber": "{INVOICE_NUMBER}",
      "document": "{BASE64_ENCODED_DOCUMENT}"
    }
  ]
}
```

**Important:**
- Maximum document size: 300KB
- Batch submission supported (multiple documents)
- Document must be Base64 encoded
- Document hash is SHA-256 of the document content

### 4. Get Submission Status

```
GET /api/v1.0/documentsubmissions/{submissionUid}
```

### 5. Get Document Details

```
GET /api/v1.0/documents/{uuid}/details
```

## Document Status Flow

| Status | Value | Description |
|--------|-------|-------------|
| Submitted | 1 | Initial validations passed, pending full validation |
| Valid | 2 | Successfully validated |
| Invalid | 3 | Validation failed |
| Cancelled | 4 | Cancelled by issuer |

## Validation Rules

### Duplicate Detection

Documents are flagged as duplicates if ALL of the following match within a 2-hour period:
- e-Invoice type and version
- Issuance date and time
- Internal ID/Invoice number
- Supplier TIN (or Buyer TIN for self-billed)

### Date Restrictions

- Issuance date cannot be more than 72 hours in the past
- Issuance date cannot be in the future
- Date/time must be in UTC format

### Special Characters

**XML:**
| Character | Escape Sequence |
|-----------|-----------------|
| < | &lt; |
| > | &gt; |
| & | &amp; |
| " | &quot; |
| ' | &apos; |

**JSON:**
| Character | Escape Sequence |
|-----------|-----------------|
| " | \\" |
| \\ | \\\\ |
| Newline | \\n |

## QR Code Generation

After successful validation, generate QR code from the validation URL:

```
{portal_base_url}/{uuid}/share/{longId}
```

Example:
```
https://myinvois.hasil.gov.my/a1b2c3d4-e5f6-7890-abcd-ef1234567890/share/xyz123...
```

## Error Handling

### Common HTTP Status Codes

| Code | Description | Action |
|------|-------------|--------|
| 400 | Bad Request | Check request parameters and format |
| 401 | Unauthorized | Refresh access token |
| 403 | Forbidden | Check permissions and certificate |
| 404 | Not Found | Verify resource exists |
| 429 | Too Many Requests | Implement backoff and retry |

### Rate Limits

- Implement standard HTTP rate limiting headers
- Handle `Retry-After` header
- Batch submissions recommended for high volume

## Implementation Checklist

### Prerequisites
- [ ] Register company TIN with LHDNM
- [ ] Obtain Client ID and Client Secret from MyInvois Portal
- [ ] Procure digital certificate from approved CA
- [ ] Set up sandbox environment for testing

### Development
- [ ] Implement OAuth 2.0 authentication
- [ ] Build document generation (UBL 2.1 format)
- [ ] Implement digital signature creation
- [ ] Build submission API integration
- [ ] Implement status polling/webhooks
- [ ] Generate QR codes for validated invoices
- [ ] Handle error scenarios and retries

### Testing
- [ ] Test in sandbox environment
- [ ] Validate all document types
- [ ] Test digital signature validation
- [ ] Verify QR code generation
- [ ] Test error handling and recovery

### Production
- [ ] Switch to production credentials
- [ ] Configure monitoring and alerts
- [ ] Implement audit logging
- [ ] Document operational procedures

## References

- [MyInvois SDK Documentation](https://sdk.myinvois.hasil.gov.my/)
- [LHDN E-Invoice Portal](https://www.hasil.gov.my/e-invois/)
- [MyInvois Portal](https://myinvois.hasil.gov.my/)
- [UBL 2.1 Specification](https://docs.oasis-open.org/ubl/UBL-2.1.html)
- [MCMC Certificate Authorities](https://www.mcmc.gov.my/en/sectors/digital-signature/list-of-licensees)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-22 | Initial documentation |
