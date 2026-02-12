#!/usr/bin/env python3
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()
sheet = wb.active
sheet.title = "Payment Events Reference"

# Define styles
header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True, size=11)
category_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
category_font = Font(bold=True, size=10)
thin_border = Border(
    left=Side(style='thin'),
    right=Side(style='thin'),
    top=Side(style='thin'),
    bottom=Side(style='thin')
)

# Headers
headers = ["Payment Type", "Event Category", "Event Name", "Event Type", "Description", "Important Notes"]
for col_num, header in enumerate(headers, 1):
    cell = sheet.cell(row=1, column=col_num)
    cell.value = header
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    cell.border = thin_border

# Data with merged rows for payment type and category
data = [
    # UPI
    ("UPI", "START EVENTS", "payment_initiated_upi", "Primary Start", "User selects UPI payment method from payment screen", "Most common start event - triggered from payment orchestrator"),
    ("", "", "qr_generation_started", "Alternative Start", "QR code generation begins", "May be first event in some flows (especially P2P)"),
    ("", "", "UPI_PAY_START", "Alternative Start", "UPI activity creation (Create_PayViaUPIActivity)", "Legacy event - older code"),
    ("", "", "MQTT_P2P_HANDLE_PAYMENT_REQUEST", "P2P Start", "P2P payment request received and being processed", "Only appears in P2P (peer-to-peer) flows"),

    ("", "SUCCESS END EVENTS", "UPI_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown to user", "Most reliable success indicator - newer format"),
    ("", "", "UPI_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown to user", "Same as above but older/shorter naming format"),
    ("", "", "upi_payment_success", "Success Marker", "Explicit success flag for analytics", "Alternative success indicator"),
    ("", "", "UPI_print_status_result", "Receipt Event", "Receipt printing completed", "May be missing if user navigates away or auto-print disabled"),
    ("", "", "UPI_THERMAL_PRINT_START", "Receipt Event", "Thermal printer started", "Optional - depends on device and auto-print settings"),

    ("", "FAILURE END EVENTS", "UPI_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown to user", "Primary failure indicator"),
    ("", "", "UPI_ACTION_ENDS", "Flow Termination", "UPI payment flow ended/terminated", "Alternative failure indicator"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User pressed back/cancel button", "NOT a system failure - exclude from drop analysis"),
    ("", "", "PAYMENT_TIMEOUT", "Timeout", "QR code expired after 300 seconds", "Expected behavior for QR expiry - exclude from drop analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "User switched to different payment method (e.g., CARD, CASH)", "NOT a drop - creates new sequence_id - exclude from analysis"),

    # BQR
    ("BHARATQR (BQR)", "START EVENTS", "payment_initiated_upi", "Primary Start", "Initially tracked as UPI, normalized to BQR in code", "Same as UPI start - differentiated by later BQR-specific events"),
    ("", "", "qr_generation_started", "Alternative Start", "QR code generation begins", "May be first event"),
    ("", "", "BQR_PAY_START", "Alternative Start", "BQR activity creation (Create_PayViaBQRActivity)", "Legacy event"),
    ("", "", "MQTT_P2P_HANDLE_PAYMENT_REQUEST", "P2P Start", "P2P payment request received", "Only for P2P flows"),

    ("", "SUCCESS END EVENTS", "BQR_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (short format)", "Primary success indicator"),
    ("", "", "BHARATQR_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (full format with BHARATQR name)", "Alternative naming - same event, more descriptive"),
    ("", "", "bqr_payment_success", "Success Marker", "Explicit success flag", "Alternative success indicator"),
    ("", "", "BQR_print_status_result", "Receipt Event", "Print completed", "Optional - may be missing"),

    ("", "FAILURE END EVENTS", "BQR_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (short format)", "Primary failure indicator"),
    ("", "", "BHARATQR_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (full format)", "Alternative naming"),
    ("", "", "BQR_ACTION_ENDS", "Flow Termination", "BQR payment flow ended", "Alternative failure indicator"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User cancelled payment", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_TIMEOUT", "Timeout", "QR expired", "Expected behavior - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),

    ("", "IMPORTANT NOTE", "Backend Database Mapping", "Critical Info", "Successful BQR → stored as payment_mode='UPI' in database", "Failed/Expired BQR → stored as payment_mode='BHARATQR'. Use event logs for accurate classification!"),

    # CARD
    ("CARD", "START EVENTS", "payment_initiated_card", "Primary Start", "User selects CARD/contactless/swipe payment", "Triggered from payment orchestrator"),
    ("", "", "CARD_PAYMENT_SELECTED", "Alternative Start", "Card payment method selected", "May be first event"),
    ("", "", "CARD_PAY_START", "Alternative Start", "Card activity creation (Create_PayViaCardActivity)", "Legacy event"),
    ("", "", "MQTT_P2P_HANDLE_PAYMENT_REQUEST", "P2P Start", "P2P payment request received", "Only for P2P flows"),

    ("", "SUCCESS END EVENTS", "CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (full format)", "Most reliable - newer code format"),
    ("", "", "CARD_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (short format)", "Legacy naming - older code, same meaning"),
    ("", "", "card_payment_success", "Success Marker", "Explicit success flag", "Alternative success indicator"),
    ("", "", "CARD_print_status_result", "Receipt Event", "Print completed", "Optional - may be missing"),

    ("", "FAILURE END EVENTS", "CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (full format)", "Primary failure indicator - newer code"),
    ("", "", "CARD_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (short format)", "Legacy naming - older code"),
    ("", "", "card_payment_failure", "Failure Marker", "Explicit failure flag", "Alternative failure indicator"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User aborted during PIN entry or card reading", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_TIMEOUT", "Timeout", "PIN entry timed out (user didn't enter PIN)", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),

    # EMI
    ("EMI", "START EVENTS", "EMI_CHECK_INITIATED", "Primary Start", "EMI eligibility check started when card is EMI-eligible", "Triggered when card supports EMI"),
    ("", "", "EMI_OVERLAY_SHOWN", "Alternative Start", "EMI selection overlay/options displayed to user", "User sees EMI plan options"),
    ("", "", "payment_initiated_card", "Inherited Start", "Inherits from CARD flow after EMI plan selected", "EMI flows through CARD payment after selection"),

    ("", "SUCCESS END EVENTS", "CARD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Same as CARD success event (with is_emi: true property)", "EMI uses CARD events with flag"),
    ("", "", "card_payment_success", "Success Marker", "Same as CARD (with is_emi: true property)", "Alternative indicator"),
    ("", "", "CARD_print_status_result", "Receipt Event", "Same as CARD", "Optional"),

    ("", "FAILURE END EVENTS", "CARD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Same as CARD (with is_emi: true property)", "Primary failure indicator"),
    ("", "", "card_payment_failure", "Failure Marker", "Same as CARD (with is_emi: true property)", "Alternative indicator"),

    ("", "USER ACTIONS (NOT DROPS)", "EMI_OPTION_NOT_SELECTED", "EMI Declined", "User declined EMI offer - proceeds with regular card payment", "NOT a drop - valid user choice"),
    ("", "", "EMI_FULL_SWIPE_OFFER_DECLINED", "Full Swipe Declined", "User declined full-swipe EMI offer", "NOT a drop - user choice"),
    ("", "", "PAYMENT_CANCELLED", "User Cancellation", "Same as CARD", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_TIMEOUT", "Timeout", "Same as CARD", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),

    ("", "IMPORTANT NOTE", "EMI Flow Pattern", "Critical Info", "EMI is an option ON TOP of card payment", "After EMI plan selection, follows normal CARD flow with is_emi: true flag in event properties"),

    # CASH
    ("CASH", "START EVENTS", "cash_payment_screen_shown", "Primary Start", "Cash payment screen displayed to user", "Simpler flow than card/UPI - manual entry"),
    ("", "", "CASH_PAYMENT_INITIATED", "Alternative Start", "Cash payment execution started", "Payment processing begins"),

    ("", "SUCCESS END EVENTS", "CASH_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (full format)", "Newer code format"),
    ("", "", "CASH_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (short format)", "Older code format"),

    ("", "FAILURE END EVENTS", "CASH_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (full format)", "Newer code format"),
    ("", "", "CASH_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (short format)", "Older code format"),
    ("", "", "cash_network_error", "Network Error", "Failed to record cash payment in backend due to connectivity", "Helps diagnose network vs business logic failures"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User cancelled", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),

    # CHEQUE
    ("CHEQUE", "START EVENTS", "cheque_payment_screen_shown", "Primary Start", "Cheque payment screen displayed", "Manual entry flow - user enters cheque details"),
    ("", "", "CHEQUE_PAYMENT_INITIATED", "Alternative Start", "Cheque payment execution started", "Payment processing begins"),

    ("", "SUCCESS END EVENTS", "cheque_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (full format)", "Newer code format"),
    ("", "", "CHEQUE_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (short format)", "Older code format"),

    ("", "FAILURE END EVENTS", "cheque_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (full format)", "Newer code format"),
    ("", "", "CHEQUE_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (short format)", "Older code format"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User cancelled during form entry", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),

    # DD
    ("DEMAND DRAFT (DD)", "START EVENTS", "dd_payment_screen_shown", "Primary Start", "Demand Draft payment screen displayed", "Least common payment type"),
    ("", "", "DD_PAYMENT_INITIATED", "Alternative Start", "DD payment execution started", "Payment processing begins"),

    ("", "SUCCESS END EVENTS", "DD_UI_EVENT_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (full format)", "Newer code format"),
    ("", "", "DD_TRANSACTION_SUCCESS_SCREEN_SHOWN", "Screen Display", "Success screen shown (short format)", "Older code format"),

    ("", "FAILURE END EVENTS", "DD_UI_EVENT_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (full format)", "Newer code format"),
    ("", "", "DD_TRANSACTION_FAILURE_SCREEN_SHOWN", "Screen Display", "Failure screen shown (short format)", "Older code format"),

    ("", "USER ACTIONS (NOT DROPS)", "PAYMENT_CANCELLED", "User Cancellation", "User cancelled", "NOT a drop - exclude from analysis"),
    ("", "", "PAYMENT_MODE_SWITCH", "Mode Switch", "Switched payment method", "NOT a drop - exclude from analysis"),
]

# Add data
current_payment_type = ""
current_category = ""
row_num = 2

for row_data in data:
    payment_type, category, event_name, event_type, description, notes = row_data

    # Track for merging
    if payment_type:
        current_payment_type = payment_type
        payment_type_start_row = row_num
    if category:
        current_category = category
        category_start_row = row_num

    # Write row
    for col_num, value in enumerate([current_payment_type if not payment_type else payment_type,
                                      current_category if not category else category,
                                      event_name, event_type, description, notes], 1):
        cell = sheet.cell(row=row_num, column=col_num)
        cell.value = value
        cell.border = thin_border
        cell.alignment = Alignment(vertical='top', wrap_text=True)

    row_num += 1

# Merge cells for payment types and categories
current_payment = None
payment_start = 2
current_cat = None
cat_start = 2

for row in range(2, row_num):
    payment = sheet.cell(row=row, column=1).value
    category = sheet.cell(row=row, column=2).value

    # Check for payment type change
    if row == row_num - 1 or sheet.cell(row=row+1, column=1).value != payment:
        if row > payment_start:
            sheet.merge_cells(start_row=payment_start, start_column=1, end_row=row, end_column=1)
            merged_cell = sheet.cell(row=payment_start, column=1)
            merged_cell.fill = category_fill
            merged_cell.font = category_font
            merged_cell.alignment = Alignment(horizontal='center', vertical='center')
        payment_start = row + 1

    # Check for category change
    if row == row_num - 1 or (sheet.cell(row=row+1, column=2).value != category or
                               sheet.cell(row=row+1, column=1).value != payment):
        if row > cat_start:
            sheet.merge_cells(start_row=cat_start, start_column=2, end_row=row, end_column=2)
            merged_cell = sheet.cell(row=cat_start, column=2)
            merged_cell.fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
            merged_cell.font = Font(bold=True, size=9)
            merged_cell.alignment = Alignment(horizontal='center', vertical='center')
        cat_start = row + 1

# Column widths
sheet.column_dimensions['A'].width = 18
sheet.column_dimensions['B'].width = 22
sheet.column_dimensions['C'].width = 50
sheet.column_dimensions['D'].width = 18
sheet.column_dimensions['E'].width = 45
sheet.column_dimensions['F'].width = 50

# Row height
sheet.row_dimensions[1].height = 30

# Freeze panes
sheet.freeze_panes = 'A2'

wb.save('/Users/peddakondannagari.r/.claude/skills/event-analyzer/Payment_Events_Reference_FINAL.xlsx')
print("✅ Created: Payment_Events_Reference_FINAL.xlsx")
print(f"   Total rows: {row_num - 1} (excluding header)")
print("   Features:")
print("   - Merged cells for Payment Type and Event Category")
print("   - Color-coded headers and categories")
print("   - Frozen header row")
print("   - Auto-wrapped text")
print("   - All edge cases covered")
