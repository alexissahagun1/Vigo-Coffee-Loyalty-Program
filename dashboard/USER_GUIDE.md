# Admin Dashboard User Guide

Welcome to the Admin Dashboard! This guide will help you navigate and use all the features of the loyalty program management system.

## 📊 Dashboard Overview

The Admin Dashboard provides a comprehensive view of your loyalty program, including customer management, employee administration, and invitation tracking. The dashboard is organized into four main tabs:

1. **Overview** - Statistics and key metrics
2. **Customers** - Customer management and search
3. **Employees** - Team member administration
4. **Invitations** - Employee invitation system

---

## 🏠 Overview Tab

The Overview tab gives you a high-level view of your loyalty program's performance.

### Statistics Cards

Six key metrics are displayed at the top:

1. **Total Customers** - Number of registered members
   - Shows trend percentage (↑ or ↓) compared to last month
   - Subtitle: "Registered members"

2. **Active Employees** - Current team status
   - Format: "Active/Total" (e.g., "10/12")
   - Subtitle: "Team members"

3. **Total Points** - Combined points across all customers
   - Shows trend percentage
   - Subtitle: "Across all customers"

4. **Total Purchases** - Number of transactions recorded
   - Shows trend percentage
   - Subtitle: "Transactions recorded"

5. **Pending Invitations** - Invitations awaiting response
   - Subtitle: "Awaiting response"

6. **Rewards Redeemed** - Total rewards claimed
   - Shows trend percentage
   - Subtitle: "Coffee & meals"

### Top Customers Section

- **Location**: Left side of the Overview tab
- **Purpose**: Displays the top 5 customers by points balance
- **Features**:
  - Shows customer initials in avatar circles
  - Displays customer name and points balance
  - Visual progress bar showing relative points
  - Medal icons for top 3 customers
  - Highlighted background for #1 customer

### Reward Progress Section

- **Location**: Right side of the Overview tab
- **Purpose**: Shows reward redemption statistics
- **Features**:
  - **Coffee Rewards**: Progress bar showing redemption rate (every 10 points)
  - **Meal Rewards**: Progress bar showing redemption rate (every 25 points)
  - **Average Points**: Calculated average points per customer

---

## 👥 Customers Tab

Manage and view all loyalty program members.

### Search Functionality

- **Location**: Top right of the Customers tab
- **How to Use**:
  1. Click in the search box labeled "Search customers..."
  2. Type any part of a customer's name or email address
  3. Results filter in real-time as you type
  4. Search is case-insensitive

### Customer Table

The table displays the following information for each customer:

1. **Customer Column**
   - Avatar with customer initials
   - Full name (or "Anonymous" if not provided)
   - Email address

2. **Points Column**
   - Current points balance
   - Displayed as a badge (e.g., "87 pts")

3. **Purchases Column**
   - Total number of purchases made
   - Numeric value

4. **Progress Column** (visible on medium+ screens)
   - Two progress bars:
     - ☕ Coffee progress (toward next 10-point reward)
     - 🍽️ Meal progress (toward next 25-point reward)
   - Visual indicators show how close they are to next reward

5. **Joined Column** (visible on large screens)
   - Date when customer registered
   - Format: "Month Day, Year" (e.g., "Feb 15, 2024")

### Understanding Progress Bars

- **Coffee Progress**: Shows percentage toward the next 10-point milestone
  - Example: 87 points = 70% toward 90 points (next coffee reward)
- **Meal Progress**: Shows percentage toward the next 25-point milestone
  - Example: 87 points = 12% toward 100 points (next meal reward)

---

## 👔 Employees Tab

Manage your team members and their access levels.

### Search Functionality

- **Location**: Top right of the Employees tab
- **How to Use**:
  1. Click in the search box labeled "Search employees..."
  2. Search by:
     - Full name
     - Email address
     - Username
  3. Results filter in real-time

### Employee Table

The table displays:

1. **Employee Column**
   - Avatar with initials (from name or username)
   - Full name or username
   - Email address

2. **Username Column** (visible on medium+ screens)
   - Employee's username
   - Format: "@username"

3. **Role Column**
   - **Admin Badge**: 🛡️ Shield icon with "Admin" label
   - **Staff Badge**: 🛡️ Shield icon with "Staff" label
   - Color-coded for easy identification

4. **Status Column**
   - **Active**: Green badge showing "Active"
   - **Inactive**: Gray badge showing "Inactive"

5. **Joined Column** (visible on large screens)
   - Date when employee was added
   - Format: "Month Day, Year"

6. **Actions Column**
   - Three-dot menu (⋮) for each employee
   - Options:
     - **Edit details**: Modify employee information
     - **Deactivate/Activate**: Toggle employee status

### Employee Roles

- **Admin**: Full access to all dashboard features
- **Staff**: Limited access (role-based permissions)

---

## ✉️ Invitations Tab

Send and manage employee invitations.

### Invite Form

**Location**: Left side of the Invitations tab

**How to Invite an Employee**:

1. Enter the employee's email address in the "Email address" field
2. Click "Send Invitation" button
3. A confirmation toast notification will appear
4. The invitation will appear in the invitations table

**Features**:
- Email validation (must be valid email format)
- Loading state while sending (shows "Sending..." with spinner)
- Success notification after sending

### Invitations Table

**Location**: Right side of the Invitations tab

**Columns**:

1. **Email Column**
   - Email address of the invited person

2. **Status Column**
   - **Pending** ⏰: Invitation sent, awaiting response
     - Yellow badge
   - **Used** ✅: Invitation accepted and account created
     - Green badge
   - **Expired** ❌: Invitation link has expired
     - Gray badge

3. **Expires Column** (visible on medium+ screens)
   - Date and time when invitation expires
   - Format: "Month Day, Hour:Minute"

4. **Created Column** (visible on large screens)
   - Date when invitation was sent
   - Format: "Month Day, Year"

5. **Actions Column**
   - **Copy Icon** 📋: Available for pending invitations
   - Click to copy the invitation link to clipboard
   - Icon changes to checkmark (✓) when copied
   - Link format: `your-domain.com/employee/register?token=abc123xyz`

### Invitation Workflow

1. **Send Invitation**: Admin creates invitation via form
2. **Pending**: Invitation appears in table with "Pending" status
3. **Copy Link**: Admin can copy invitation link to share with employee
4. **Employee Accepts**: Status changes to "Used" when employee registers
5. **Expiration**: If not used before expiration date, status changes to "Expired"

---

## 🎨 Visual Elements

### Color Coding

- **Primary Color**: Orange/red accent (used for active states, primary actions)
- **Success**: Green (active employees, used invitations)
- **Warning**: Yellow/orange (pending invitations)
- **Muted**: Gray (inactive employees, expired invitations)

### Icons

- 📊 **LayoutDashboard**: Overview tab
- 👥 **Users**: Customers tab
- ✅ **UserCheck**: Employees tab
- ✉️ **Mail**: Invitations tab
- 🔍 **Search**: Search functionality
- ☕ **Coffee**: Coffee rewards
- 🍽️ **UtensilsCrossed**: Meal rewards
- 🏆 **Trophy**: Top customers
- 🛡️ **Shield**: Employee roles

### Animations

- **Slide-up animations**: Cards and sections fade in with upward motion
- **Hover effects**: Cards and table rows highlight on hover
- **Progress bars**: Smooth transitions when values change

---

## 💡 Tips & Best Practices

### For Customer Management

1. **Regular Monitoring**: Check the Overview tab daily to track program health
2. **Top Customers**: Focus on top customers - they're your most engaged members
3. **Search Efficiently**: Use search to quickly find specific customers
4. **Progress Tracking**: Monitor progress bars to see who's close to rewards

### For Employee Management

1. **Role Assignment**: Assign Admin role only to trusted team members
2. **Status Management**: Deactivate employees who no longer work with you
3. **Regular Audits**: Review employee list periodically to ensure accuracy

### For Invitations

1. **Timely Follow-up**: Check pending invitations regularly
2. **Link Sharing**: Copy invitation links and share via secure channels
3. **Expiration Awareness**: Note expiration dates - expired invitations need to be resent
4. **Email Verification**: Double-check email addresses before sending

### Performance Monitoring

1. **Trend Indicators**: Pay attention to ↑/↓ trend arrows on stat cards
2. **Monthly Comparison**: Trends show percentage change vs. last month
3. **Key Metrics**: Focus on Total Customers and Total Points as primary KPIs

---

## 🔍 Quick Reference

### Keyboard Shortcuts

- **Tab Navigation**: Use mouse to click tabs
- **Search**: Click in search box and start typing
- **Copy Link**: Click copy icon in invitations table

### Common Tasks

**Find a Customer**:
1. Go to Customers tab
2. Type name or email in search box
3. View filtered results

**Invite New Employee**:
1. Go to Invitations tab
2. Enter email in form
3. Click "Send Invitation"
4. Copy link and share with employee

**Check Program Health**:
1. Go to Overview tab
2. Review all 6 stat cards
3. Check trend indicators
4. Review top customers

**Manage Employee**:
1. Go to Employees tab
2. Search for employee if needed
3. Click three-dot menu (⋮)
4. Select action (Edit/Activate/Deactivate)

---

## ❓ Frequently Asked Questions

### Q: How do I know if a customer is close to earning a reward?
**A**: Check the Progress column in the Customers table. The progress bars show how close they are to the next 10-point (coffee) or 25-point (meal) reward.

### Q: What happens if an invitation expires?
**A**: Expired invitations cannot be used. You'll need to send a new invitation to that email address.

### Q: Can I edit customer information?
**A**: Currently, the dashboard displays customer data. Editing functionality would be added based on your backend API capabilities.

### Q: How are top customers determined?
**A**: Top customers are sorted by points balance in descending order. The top 5 are displayed in the Overview tab.

### Q: What's the difference between Admin and Staff roles?
**A**: Admin has full access to all features. Staff has limited access (specific permissions depend on your backend implementation).

### Q: How do I see more customer details?
**A**: Click on a customer row to view details (if detail view is implemented) or use the search to find specific customers.

---

## 🆘 Troubleshooting

### Search Not Working
- Ensure you're typing in the correct search box for the current tab
- Check that the text matches part of the name or email
- Try refreshing the page

### Invitation Link Not Copying
- Ensure the invitation status is "Pending"
- Check browser permissions for clipboard access
- Try clicking the copy icon again

### Data Not Updating
- Refresh the page to get latest data
- Check your internet connection
- Verify backend API is running

### Images Not Loading
- Check that image files exist in `/public/assets/`
- Verify image paths are correct
- Clear browser cache

---

## 📱 Responsive Design

The dashboard is fully responsive and works on:

- **Desktop**: Full feature set, all columns visible
- **Tablet**: Some columns hidden, optimized layout
- **Mobile**: Compact view, essential information only

### Mobile Optimizations

- Tab labels may show icons only on small screens
- Table columns hidden on mobile (essential info remains)
- Search boxes expand to full width
- Touch-friendly button sizes

---

## 🔐 Security Notes

- **Access Control**: Ensure proper authentication is implemented
- **Role-Based Access**: Verify users have appropriate permissions
- **Data Privacy**: Customer and employee data should be protected
- **Secure Links**: Invitation tokens should be unique and time-limited

---

## 📞 Support

For technical issues or questions about the dashboard functionality, contact your system administrator or development team.

---

**Last Updated**: December 2024
**Dashboard Version**: 1.0.0

