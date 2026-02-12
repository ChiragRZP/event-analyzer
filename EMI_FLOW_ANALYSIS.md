# EMI Flow Complete Analysis
**Date**: 2026-02-12  
**Codebase**: /Users/peddakondannagari.r/newpos/pos

---

## Executive Summary

EMI (Equated Monthly Installment) has **TWO ACTIVE user flows** and **ONE DISABLED flow** in the POS system:

1. ✅ **Direct Bank/Card EMI** - User selects EMI as primary payment method
2. ✅ **Catalog/Brand EMI** - User selects product first, then EMI plans
3. ⚠️ **Auto Card-to-EMI** - DISABLED due to latency issues

---

## Flow 1: Direct Bank/Card EMI ✅ ACTIVE

### User Journey
```
Amount Screen
    ↓
Payment Method Selection (UniversalPay.svelte)
    ↓
User clicks "EMI" button
    ↓
Bank EMI Plan Selection (BankEmi.svelte)
    ↓
User selects bank, tenure, plan
    ↓
Proceeds to payment
```

### Code References
- **Payment orchestrator**: `web/src/modules/payment/index.ts:202-203`
  ```typescript
  case 'EMI':
    return payViaEmi(props, stackElement);
  ```

- **EMI enabled check**: `web/src/lib/eze/config.ts:256`
  ```typescript
  if (isEMIMethodEnabled() && isValidEMIAmount(amount)) modes.push('EMI');
  ```

- **Payment selection UI**: `web/src/modules/payment/UniversalPay.svelte:74`
  ```typescript
  const frequentModes = ['UPI', 'CARD', 'PAYLINK', 'EMI', 'PRE_AUTH'];
  ```

### START EVENT
**Event Name**: `emi_plan_selection_page_viewed`  
**Location**: `web/src/pages/pay/EMI/BankEmi.svelte:262`  
**Tracking Code**:
```typescript
onMount(() => {
  mountTime = Date.now();
  track(EMI_TRACK_EVENTS.EMI_PLAN_SELECTION_PAGE_VIEWED, {
    emi_type: emiType,
    transaction_amount: paymentRequest.amount,
    flow: 'bank_emi_flow',
  });
  fetchEmiPlans();
});
```

**Properties Tracked**:
- `emi_type`: NORMAL or MYDISCOUNTEMI
- `transaction_amount`: Payment amount
- `flow`: 'bank_emi_flow'

---

## Flow 2: Catalog/Brand EMI ✅ ACTIVE

### User Journey
```
Main Menu
    ↓
User clicks "Catalog" (menu_catalog_tapped)
    ↓
Catalog Dashboard (CatalogDashboard.svelte)
    ↓
User selects Brand
    ↓
Brand Dashboard (BrandDashboard.svelte)
    ↓
User selects Product/SKU
    ↓
Payment Options with EMI Plans (PaymentOptions.svelte)
    ↓
User selects EMI plan
    ↓
Proceeds to payment
```

### Code References
- **Catalog menu**: `web/src/pages/menu/menu.svelte:138`
  ```typescript
  track(CATALOG_TRACK_EVENTS.MENU_CATALOG_TAPPED);
  return pushStack({ target: Catalog, route: 'catalog' });
  ```

- **Product selection**: Opens `PaymentOptions.svelte`

### START EVENT
**Event Name**: `CATALOG_PAYMENT_OPTIONS_MOUNTED`  
**Location**: `web/src/pages/catalog/PaymentOptions.svelte:354`  
**Tracking Code**:
```typescript
onMount(() => {
  mountTime = Date.now();
  track(CATALOG_TRACK_EVENTS.CATALOG_PAYMENT_OPTIONS_MOUNTED, {
    ...(product ? { ...product } : {}),
    amount: initialAmount,
    timestamp: mountTime,
  });
  fetchEmiPlans();
});
```

**Properties Tracked**:
- Product details (brandName, skuCode, productName, etc.)
- `amount`: Initial product amount
- `timestamp`: Mount timestamp

---

## Flow 3: Auto Card-to-EMI Check ⚠️ DISABLED

### Original Design (NOW DISABLED)
```
User selects CARD payment
    ↓
System auto-checks card EMI eligibility
    ↓
IF eligible: Show EMI overlay (CardEmi.svelte)
    ↓
User can choose EMI plan or continue with regular card payment
```

### Why DISABLED?
**Location**: `web/src/modules/payment/emi/emi-flow.ts:73`  
```typescript
const shouldCheckForCardEmiOptions = false; //Temporarily disabled due to latency
```

### Events (NOT ACTIVE)
1. **`emi_check_initiated`**
   - **Location**: `emi-flow.ts:168`
   - **Status**: ⚠️ DISABLED - Never fires because `shouldCheckForCardEmiOptions = false`
   - **Code**:
     ```typescript
     track(EMI_TRACK_EVENTS.EMI_CHECK_INITIATED, {
       transaction_amount: amount,
       min_emi_amount: minAmount,
       max_emi_amount: maxAmount,
     });
     ```

2. **`emi_overlay_shown`**
   - **Location**: `emi-flow.ts:227`
   - **Status**: ⚠️ DISABLED - Only fires when auto-check is enabled
   - **Code**:
     ```typescript
     track(EMI_TRACK_EVENTS.EMI_OVERLAY_SHOWN, {
       transaction_amount: amount,
       emi_options_count: cardEmiResponse.emiOptions.length,
       bank_name: cardEmiResponse.bankName,
       card_type: cardEmiResponse.cardType,
     });
     ```

---

## Non-Existent Events

### ❌ `menu_emi_tapped`
- **Status**: NOT FOUND in codebase
- **Notes**: Exists only in Events-Master-Sheet.xlsx
- **Reality**: No dedicated EMI menu option; EMI accessed via:
  1. Direct selection from payment methods (UniversalPay)
  2. Catalog product flow

---

## Event Definitions Summary

| Event Name | Status | Flow | Location |
|------------|--------|------|----------|
| `emi_plan_selection_page_viewed` | ✅ ACTIVE | Direct Bank/Card EMI | BankEmi.svelte:262, CardEmi.svelte |
| `CATALOG_PAYMENT_OPTIONS_MOUNTED` | ✅ ACTIVE | Catalog/Brand EMI | PaymentOptions.svelte:354 |
| `emi_check_initiated` | ⚠️ DISABLED | Auto card-to-EMI | emi-flow.ts:168 (disabled:73) |
| `emi_overlay_shown` | ⚠️ DISABLED | Auto card-to-EMI | emi-flow.ts:227 (disabled:73) |
| `menu_emi_tapped` | ❌ NOT FOUND | N/A | Not in codebase |

---

## Payment Events Reference Excel

**File**: `/Users/peddakondannagari.r/.claude/skills/event-analyzer/Payment_Events_Reference_FINAL.xlsx`

**Updated EMI START EVENTS Section** (Rows 74-79):
- Row 74: `emi_plan_selection_page_viewed` - Primary Start (Direct EMI)
- Row 75: `CATALOG_PAYMENT_OPTIONS_MOUNTED` - Primary Start (Catalog EMI)
- Row 76: `emi_check_initiated` - Auto EMI Check (DISABLED) ⚠️
- Row 77: `emi_overlay_shown` - EMI Overlay (DISABLED) ⚠️
- Row 78: `menu_emi_tapped` - Menu EMI (NOT IMPLEMENTED) ❌
- Row 79: IMPORTANT NOTE - Explains the two active flows

---

## Key Files Reference

### EMI Flow Logic
- `web/src/modules/payment/emi/emi-flow.ts` - EMI validation and auto-check logic (disabled)
- `web/src/pages/pay/EMI/BankEmi.svelte` - Bank EMI plan selection UI
- `web/src/pages/pay/EMI/CardEmi.svelte` - Card EMI overlay (disabled flow)
- `web/src/pages/catalog/PaymentOptions.svelte` - Catalog EMI flow

### Payment Orchestration
- `web/src/modules/payment/index.ts` - Main payment router
- `web/src/modules/payment/UniversalPay.svelte` - Payment method selection
- `web/src/lib/eze/config.ts` - Payment mode configuration

### Event Tracking
- `web/src/lib/track/emi.ts` - All EMI event constants
- `web/src/lib/track/index.ts` - Main tracking module

---

## Recommendations

1. **Remove from Excel**: `menu_emi_tapped` (not implemented)
2. **Mark as disabled**: `emi_check_initiated` and `emi_overlay_shown`
3. **Document active flows**: Two primary flows for EMI selection
4. **Future consideration**: Re-enable auto card-to-EMI if latency issue resolved

---

## Analysis Date
**Generated**: 2026-02-12  
**Analyst**: Claude Code  
**Codebase Version**: Current (newpos/pos)
