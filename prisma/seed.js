const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Urban Dhaga database seed...");

  // 1. Clean existing records safely
  await prisma.activityLog.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.shipmentDetails.deleteMany();
  await prisma.orderMockup.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.pricingTier.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Team / Staff Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Arjun Sharma",
        email: "arjun@urbandhaga.com",
        role: "OWNER",
        phone: "+91 98765 43210",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
    }),
    prisma.user.create({
      data: {
        name: "Pooja Nair",
        email: "pooja.sales@urbandhaga.com",
        role: "SALES",
        phone: "+91 98111 22334",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      },
    }),
    prisma.user.create({
      data: {
        name: "Vikram Rathore",
        email: "vikram.ops@urbandhaga.com",
        role: "PRODUCTION",
        phone: "+91 98222 33445",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      },
    }),
    prisma.user.create({
      data: {
        name: "Meera Sen",
        email: "meera.accounts@urbandhaga.com",
        role: "ACCOUNTS",
        phone: "+91 98333 44556",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      },
    }),
  ]);

  // 3. Seed Vendors / Job Workers
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: "Apex Master Printers",
        companyName: "Apex Textile Processing LLP",
        contactPerson: "Ramesh Babu",
        phone: "+91 98450 11223",
        email: "contact@apextextiles.in",
        servicesProvided: "SCREEN_PRINTING, DTF",
        address: "Plot 42, Peenya 2nd Stage, Bangalore - 560058",
        rating: 4.9,
        activeJobsCount: 3,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "TexCraft Embroidery",
        companyName: "TexCraft Precision Studio",
        contactPerson: "Sundar Rajan",
        phone: "+91 97412 88990",
        email: "sundar@texcraft.co",
        servicesProvided: "EMBROIDERY, HIGH_DENSITY_BADGES",
        address: "Bommanahalli Industrial Area, Bangalore - 560068",
        rating: 4.8,
        activeJobsCount: 2,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "PackPro Custom Packaging",
        companyName: "PackPro Boxes & Crates Ltd",
        contactPerson: "Dinesh Jain",
        phone: "+91 99001 55667",
        email: "dinesh@packpro.in",
        servicesProvided: "PACKAGING, RIGID_BOXES",
        address: "Chickpet Commercial Hub, Bangalore - 560053",
        rating: 4.7,
        activeJobsCount: 1,
      },
    }),
  ]);

  // 4. Seed Products with Variants and Slab Pricing
  const prodTee = await prisma.product.create({
    data: {
      sku: "UD-TSH-001",
      name: "Heavyweight Cotton Oversized Tee (240 GSM)",
      category: "APPAREL",
      description: "Custom premium combed cotton oversized t-shirt with ribbed collar, bio-washed and pre-shrunk. Ideal for high-density screen printing & DTF graphics.",
      basePrice: 480,
      gstRate: 5.0,
      hsnCode: "6109",
      material: "100% Combed Compact Cotton, 240 GSM, Bio-washed",
      leadTimeDays: 7,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
      ]),
      pricingTiers: {
        create: [
          { minQty: 50, maxQty: 99, unitPrice: 480 },
          { minQty: 100, maxQty: 299, unitPrice: 420 },
          { minQty: 300, maxQty: 499, unitPrice: 375 },
          { minQty: 500, maxQty: null, unitPrice: 340 },
        ],
      },
      variants: {
        create: [
          { sku: "UD-TSH-001-BLK-S", size: "S", color: "Jet Black", colorHex: "#111827", currentStock: 140, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-BLK-M", size: "M", color: "Jet Black", colorHex: "#111827", currentStock: 260, lowStockThreshold: 40 },
          { sku: "UD-TSH-001-BLK-L", size: "L", color: "Jet Black", colorHex: "#111827", currentStock: 195, lowStockThreshold: 40 },
          { sku: "UD-TSH-001-BLK-XL", size: "XL", color: "Jet Black", colorHex: "#111827", currentStock: 85, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-BLK-2XL", size: "2XL", color: "Jet Black", colorHex: "#111827", currentStock: 24, lowStockThreshold: 25 }, // Low stock trigger
          { sku: "UD-TSH-001-WHT-S", size: "S", color: "Off-White", colorHex: "#F8FAFC", currentStock: 110, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-WHT-M", size: "M", color: "Off-White", colorHex: "#F8FAFC", currentStock: 180, lowStockThreshold: 40 },
          { sku: "UD-TSH-001-WHT-L", size: "L", color: "Off-White", colorHex: "#F8FAFC", currentStock: 145, lowStockThreshold: 40 },
          { sku: "UD-TSH-001-WHT-XL", size: "XL", color: "Off-White", colorHex: "#F8FAFC", currentStock: 60, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-NVY-M", size: "M", color: "Washed Navy", colorHex: "#1E293B", currentStock: 95, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-NVY-L", size: "L", color: "Washed Navy", colorHex: "#1E293B", currentStock: 115, lowStockThreshold: 30 },
          { sku: "UD-TSH-001-SGE-M", size: "M", color: "Sage Green", colorHex: "#3F6212", currentStock: 18, lowStockThreshold: 25 }, // Low stock trigger
        ],
      },
    },
  });

  const prodHoodie = await prisma.product.create({
    data: {
      sku: "UD-HOD-002",
      name: "Premium Brushed Fleece Zip Hoodie (380 GSM)",
      category: "APPAREL",
      description: "Heavyweight 380 GSM brushed fleece hoodie featuring double-layered hood, kangaroo pockets, metal eyelets and premium YKK metallic zipper.",
      basePrice: 1150,
      gstRate: 12.0,
      hsnCode: "6110",
      material: "80% Cotton / 20% Polyester Heavy Fleece, 380 GSM",
      leadTimeDays: 10,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1578768079052-aa76e520028b?w=800&auto=format&fit=crop&q=80",
      ]),
      pricingTiers: {
        create: [
          { minQty: 50, maxQty: 99, unitPrice: 1150 },
          { minQty: 100, maxQty: 299, unitPrice: 980 },
          { minQty: 300, maxQty: null, unitPrice: 890 },
        ],
      },
      variants: {
        create: [
          { sku: "UD-HOD-002-BLK-M", size: "M", color: "Midnight Black", colorHex: "#09090B", currentStock: 80, lowStockThreshold: 20 },
          { sku: "UD-HOD-002-BLK-L", size: "L", color: "Midnight Black", colorHex: "#09090B", currentStock: 120, lowStockThreshold: 25 },
          { sku: "UD-HOD-002-BLK-XL", size: "XL", color: "Midnight Black", colorHex: "#09090B", currentStock: 65, lowStockThreshold: 20 },
          { sku: "UD-HOD-002-CHR-M", size: "M", color: "Charcoal Grey", colorHex: "#334155", currentStock: 45, lowStockThreshold: 20 },
          { sku: "UD-HOD-002-CHR-L", size: "L", color: "Charcoal Grey", colorHex: "#334155", currentStock: 70, lowStockThreshold: 20 },
          { sku: "UD-HOD-002-CHR-XL", size: "XL", color: "Charcoal Grey", colorHex: "#334155", currentStock: 12, lowStockThreshold: 20 }, // Low stock
        ],
      },
    },
  });

  const prodBottle = await prisma.product.create({
    data: {
      sku: "UD-BOT-003",
      name: "Matte Insulated Thermal Tumbler (750ml)",
      category: "DRINKWARE",
      description: "Double-walled 304 food-grade stainless steel vacuum bottle with leak-proof bamboo lid. Keeps beverages cold 24h, hot 12h. Laser-engraved branding.",
      basePrice: 420,
      gstRate: 18.0,
      hsnCode: "7323",
      material: "304 Stainless Steel + Bamboo Top",
      leadTimeDays: 5,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
      ]),
      pricingTiers: {
        create: [
          { minQty: 50, maxQty: 99, unitPrice: 420 },
          { minQty: 100, maxQty: 499, unitPrice: 360 },
          { minQty: 500, maxQty: null, unitPrice: 310 },
        ],
      },
      variants: {
        create: [
          { sku: "UD-BOT-003-BLK", size: "FREE_SIZE", color: "Matte Black", colorHex: "#18181B", currentStock: 340, lowStockThreshold: 50 },
          { sku: "UD-BOT-003-SLV", size: "FREE_SIZE", color: "Brushed Silver", colorHex: "#E2E8F0", currentStock: 190, lowStockThreshold: 50 },
        ],
      },
    },
  });

  const prodKit = await prisma.product.create({
    data: {
      sku: "UD-KIT-001",
      name: "The Founder's Welcome Kit Alpha",
      category: "WELCOME_KITS",
      description: "Curated corporate onboarding pack containing 1 Heavyweight Tee, 1 Insulated Tumbler, 1 Vegan Leather Notebook, 1 Metal Gel Pen, and a Custom Magnetic Rigid Box with silver foil client branding.",
      basePrice: 1650,
      gstRate: 18.0,
      hsnCode: "9983",
      material: "Curated Set: Cotton + Steel + PU Leather + Rigid Cardboard",
      leadTimeDays: 12,
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80",
      ]),
      pricingTiers: {
        create: [
          { minQty: 50, maxQty: 99, unitPrice: 1650 },
          { minQty: 100, maxQty: 249, unitPrice: 1450 },
          { minQty: 250, maxQty: null, unitPrice: 1280 },
        ],
      },
      variants: {
        create: [
          { sku: "UD-KIT-001-STD", size: "FREE_SIZE", color: "Custom Monochrome Box", colorHex: "#27272A", currentStock: 95, lowStockThreshold: 30 },
        ],
      },
    },
  });

  // 5. Seed Customers
  const custCRED = await prisma.customer.create({
    data: {
      customerCode: "UD-CUST-101",
      companyName: "Dreamplug Technologies (CRED)",
      contactPerson: "Akashdeep Verma",
      email: "akashdeep@cred.club",
      phone: "+91 99000 12345",
      gstin: "29AABCC4567H1Z2",
      address: "100ft Road, Indiranagar",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560038",
      totalOrders: 3,
      totalSpend: 548000,
      notes: "High aesthetic standards. Always request matte finish prints and subtle ton-sur-ton embroidery.",
    },
  });

  const custRazorpay = await prisma.customer.create({
    data: {
      customerCode: "UD-CUST-102",
      companyName: "Razorpay Software Pvt Ltd",
      contactPerson: "Divya Krishnan",
      email: "divya.k@razorpay.com",
      phone: "+91 98450 77889",
      gstin: "29AABCR8765G1Z9",
      address: "SJR Cyber, Hosur Road, Adugodi",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560030",
      totalOrders: 5,
      totalSpend: 924000,
      notes: "Strict 10-day turnaround for quarterly team releases. Standard blue & white pantone match required.",
    },
  });

  const custSwiggy = await prisma.customer.create({
    data: {
      customerCode: "UD-CUST-103",
      companyName: "Bundl Technologies (Swiggy)",
      contactPerson: "Rahul Narayanan",
      email: "rahul.n@swiggy.in",
      phone: "+91 97420 33221",
      gstin: "29AABCS6654M1ZX",
      address: "Tavarekere Main Road, BTM 1st Stage",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560029",
      totalOrders: 2,
      totalSpend: 756000,
      notes: "Swiggy Tech summit merchandize partner.",
    },
  });

  const custPostman = await prisma.customer.create({
    data: {
      customerCode: "UD-CUST-104",
      companyName: "Postman Inc",
      contactPerson: "Sneha Kapadia",
      email: "sneha.k@postman.com",
      phone: "+91 98200 66554",
      gstin: "27AABCP9999K1Z4",
      address: "Bandra Kurla Complex",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400051",
      totalOrders: 1,
      totalSpend: 362500,
      notes: "Global dev summit kit requirement.",
    },
  });

  // 6. Seed Leads & Inquiries Pipeline
  await Promise.all([
    prisma.lead.create({
      data: {
        leadNumber: "LD-1041",
        companyName: "Zerodha Broking Ltd",
        contactPerson: "Kavita Rao",
        email: "kavita.r@zerodha.com",
        phone: "+91 98888 12345",
        city: "Bangalore",
        requirement: "600 Oversized Minimalist Organic Cotton Tees with subtle nape embroidery for internal engineering team.",
        category: "APPAREL",
        estimatedQuantity: 600,
        estimatedBudget: 240000,
        targetDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        stage: "NEGOTIATION",
        source: "REFERRAL",
        notes: "Client prefers sample swatch before final sign-off.",
        assignedTo: "Pooja Nair",
      },
    }),
    prisma.lead.create({
      data: {
        leadNumber: "LD-1042",
        companyName: "InMobi Technologies",
        contactPerson: "Saurabh Deshmukh",
        email: "saurabh.d@inmobi.com",
        phone: "+91 98451 99887",
        city: "Bangalore",
        requirement: "250 New Hire Welcome Kits Alpha (Tee + Bottle + Diary + Custom Laser Packaging).",
        category: "WELCOME_KITS",
        estimatedQuantity: 250,
        estimatedBudget: 350000,
        targetDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        stage: "QUOTE_SENT",
        source: "WEBSITE",
        notes: "Formal quotation submitted UD-QT-2026-0043. Follow up on Tuesday.",
        assignedTo: "Pooja Nair",
      },
    }),
    prisma.lead.create({
      data: {
        leadNumber: "LD-1043",
        companyName: "Groww (Nextbillion Tech)",
        contactPerson: "Tanmay Bansal",
        email: "tanmay.b@groww.in",
        phone: "+91 97312 44556",
        city: "Bangalore",
        requirement: "1200 Custom Printed Polos & 1200 Tumblers for Pan-India FinTech Summit.",
        category: "APPAREL",
        estimatedQuantity: 1200,
        estimatedBudget: 850000,
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stage: "REQUIREMENT_GATHERED",
        source: "WHATSAPP",
        notes: "Requested size matrix calculator and pricing slabs.",
        assignedTo: "Arjun Sharma",
      },
    }),
    prisma.lead.create({
      data: {
        leadNumber: "LD-1044",
        companyName: "Peak XV Partners",
        contactPerson: "Ananya Mittal",
        email: "ananya@peakxv.com",
        phone: "+91 99100 22334",
        city: "New Delhi / Bangalore",
        requirement: "120 Custom French Terry Bomber Jackets for Founder Annual Retreat.",
        category: "APPAREL",
        estimatedQuantity: 120,
        estimatedBudget: 220000,
        targetDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        stage: "NEW",
        source: "WEBSITE",
        notes: "Inbound inquiry via website form. Needs high-end tactile finish.",
        assignedTo: "Pooja Nair",
      },
    }),
    prisma.lead.create({
      data: {
        leadNumber: "LD-1045",
        companyName: "Urban Company",
        contactPerson: "Rohan Chopra",
        email: "rohan.c@urbancompany.com",
        phone: "+91 98109 88776",
        city: "Gurugram",
        requirement: "2500 Dri-Fit Uniform T-Shirts with Reflective Vinyl Print.",
        category: "APPAREL",
        estimatedQuantity: 2500,
        estimatedBudget: 625000,
        targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        stage: "CONTACTED",
        source: "DIRECT",
        notes: "Spoke with procurement. Fabric sample courier sent on Monday.",
        assignedTo: "Arjun Sharma",
      },
    }),
    prisma.lead.create({
      data: {
        leadNumber: "LD-1046",
        companyName: "Slice Card",
        contactPerson: "Nikhil Joshi",
        email: "nikhil.j@sliceit.com",
        phone: "+91 97111 65432",
        city: "Bangalore",
        requirement: "500 Heavyweight Canvas Tote Bags with purple screen print.",
        category: "GIFTS",
        estimatedQuantity: 500,
        estimatedBudget: 85000,
        targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stage: "WON",
        source: "WHATSAPP",
        notes: "Converted into Order UD-ORD-2026-0018.",
        assignedTo: "Pooja Nair",
      },
    }),
  ]);

  // 7. Seed Quotations
  const quote1 = await prisma.quotation.create({
    data: {
      quoteNumber: "UD-QT-2026-0041",
      customerId: custCRED.id,
      customerName: "Akashdeep Verma",
      companyName: "Dreamplug Technologies (CRED)",
      clientEmail: "akashdeep@cred.club",
      clientPhone: "+91 99000 12345",
      clientGstin: "29AABCC4567H1Z2",
      shippingAddress: "100ft Road, Indiranagar, Bangalore - 560038",
      status: "ACCEPTED",
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 124500,
      discountPercent: 0,
      discountAmount: 0,
      taxType: "CGST_SGST",
      gstRate: 5.0,
      taxAmount: 6225,
      grandTotal: 130725,
      advanceRequiredPercent: 50.0,
      paymentTerms: "50% advance to initiate fabric cutting, 50% prior to dispatch",
      estimatedDays: 9,
      notes: "Strict PANTONE 19-4007 Black match. Custom neck tag included.",
      items: {
        create: [
          {
            productTitle: "Heavyweight Cotton Oversized Tee (240 GSM) - Jet Black",
            description: "240 GSM Bio-washed cotton, rib collar, custom size split",
            sizeBreakdown: JSON.stringify({ S: 40, M: 110, L: 100, XL: 40, "2XL": 10 }),
            quantity: 300,
            baseUnitPrice: 375,
            customizationDetails: "Front Left Chest Ton-sur-Ton Embroidery + Inside Woven Neck Label",
            customizationCost: 40,
            unitPrice: 415,
            lineTotal: 124500,
          },
        ],
      },
    },
  });

  const quote2 = await prisma.quotation.create({
    data: {
      quoteNumber: "UD-QT-2026-0042",
      customerId: custRazorpay.id,
      customerName: "Divya Krishnan",
      companyName: "Razorpay Software Pvt Ltd",
      clientEmail: "divya.k@razorpay.com",
      clientPhone: "+91 98450 77889",
      clientGstin: "29AABCR8765G1Z9",
      shippingAddress: "SJR Cyber, Hosur Road, Adugodi, Bangalore - 560030",
      status: "SENT",
      validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      subtotal: 423000,
      discountPercent: 5.0,
      discountAmount: 21150,
      taxType: "CGST_SGST",
      gstRate: 12.0,
      taxAmount: 48222,
      grandTotal: 450072,
      advanceRequiredPercent: 50.0,
      paymentTerms: "50% advance on PO, 50% on delivery",
      estimatedDays: 12,
      notes: "Razorpay anniversary batch. Includes custom metal zip puller.",
      items: {
        create: [
          {
            productTitle: "Premium Brushed Fleece Zip Hoodie (380 GSM)",
            description: "380 GSM heavy fleece, midnight black",
            sizeBreakdown: JSON.stringify({ M: 150, L: 200, XL: 100 }),
            quantity: 450,
            baseUnitPrice: 890,
            customizationDetails: "Left Chest Silicone Patch + Back High-Density Screen Print (Royal Blue & White)",
            customizationCost: 50,
            unitPrice: 940,
            lineTotal: 423000,
          },
        ],
      },
    },
  });

  // 8. Seed Active Orders & Production Lifecycle
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "UD-ORD-2026-0014",
      customerId: custSwiggy.id,
      companyName: "Bundl Technologies (Swiggy)",
      contactPerson: "Rahul Narayanan",
      contactEmail: "rahul.n@swiggy.in",
      contactPhone: "+91 97420 33221",
      shippingAddress: "Swiggy HQ, Tavarekere Main Road, BTM 1st Stage, Bangalore - 560029",
      stage: "IN_PRODUCTION",
      priority: "HIGH",
      targetDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      totalAmount: 756000,
      advancePaid: 378000,
      balanceDue: 378000,
      paymentStatus: "PARTIAL_PAID",
      jobSheetNumber: "JS-2026-0088",
      notes: "Swiggy Tech Summit 2026. All items must be individual polybag packed with size sticker.",
      items: {
        create: [
          {
            productName: "Heavyweight Cotton Oversized Tee (240 GSM) - Off-White",
            sku: "UD-TSH-001",
            sizeBreakdown: JSON.stringify({ S: 100, M: 350, L: 300, XL: 100 }),
            quantity: 850,
            unitPrice: 410,
            customizationDetails: "Chest DTF Gradient Graphic + Back Tagline Screen Print",
            lineTotal: 348500,
          },
          {
            productName: "Matte Insulated Thermal Tumbler (750ml) - Matte Black",
            sku: "UD-BOT-003",
            sizeBreakdown: JSON.stringify({ FREE_SIZE: 850 }),
            quantity: 850,
            unitPrice: 320,
            customizationDetails: "Laser Etched Swiggy Tech Crest Logo",
            lineTotal: 272000,
          },
        ],
      },
      mockups: {
        create: [
          {
            title: "Tee Front & Back Artwork Proof v2",
            fileUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
            version: 2,
            approvalStatus: "APPROVED",
            clientFeedback: "Approved by Rahul on Slack. Proceed with production run.",
          },
          {
            title: "Tumbler Laser Engrave Position v1",
            fileUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
            version: 1,
            approvalStatus: "APPROVED",
            clientFeedback: "Scale logo to 45mm width approved.",
          },
        ],
      },
      qualityCheck: {
        create: {
          fabricQualityChecked: true,
          printFidelityChecked: true,
          colorAccuracyChecked: true,
          stitchingFinishChecked: false, // in progress
          packagingChecked: false,
          passed: false,
          inspectedBy: "Vikram Rathore",
          remarks: "Fabric GSM verified at 242 GSM. Print curing passed wash test. Stitching inspection currently on line 2.",
        },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: "UD-ORD-2026-0015",
      quotationId: quote1.id,
      customerId: custCRED.id,
      companyName: "Dreamplug Technologies (CRED)",
      contactPerson: "Akashdeep Verma",
      contactEmail: "akashdeep@cred.club",
      contactPhone: "+91 99000 12345",
      shippingAddress: "100ft Road, Indiranagar, Bangalore - 560038",
      stage: "READY_FOR_DISPATCH",
      priority: "NORMAL",
      targetDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      totalAmount: 130725,
      advancePaid: 65362,
      balanceDue: 65363,
      paymentStatus: "PARTIAL_PAID",
      jobSheetNumber: "JS-2026-0089",
      notes: "Ready for courier pickup. Master carton labeled.",
      items: {
        create: [
          {
            productName: "Heavyweight Cotton Oversized Tee (240 GSM) - Jet Black",
            sku: "UD-TSH-001",
            sizeBreakdown: JSON.stringify({ S: 40, M: 110, L: 100, XL: 40, "2XL": 10 }),
            quantity: 300,
            unitPrice: 415,
            customizationDetails: "Ton-sur-Ton Embroidery + Inside Woven Neck Label",
            lineTotal: 124500,
          },
        ],
      },
      qualityCheck: {
        create: {
          fabricQualityChecked: true,
          printFidelityChecked: true,
          colorAccuracyChecked: true,
          stitchingFinishChecked: true,
          packagingChecked: true,
          passed: true,
          inspectedBy: "Vikram Rathore",
          remarks: "All 5 quality checks passed with zero rejections. Packaging verified.",
          checkedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
      },
      shipment: {
        create: {
          courierPartner: "Shiprocket / Delhivery",
          trackingNumber: "SR-88492019-IN",
          dispatchDate: new Date(),
          estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          packageCount: 6,
          totalWeightKg: 78.5,
          status: "MANIFESTED",
          trackingUrl: "https://shiprocket.co/tracking/SR-88492019-IN",
        },
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      orderNumber: "UD-ORD-2026-0016",
      customerId: custPostman.id,
      companyName: "Postman Inc",
      contactPerson: "Sneha Kapadia",
      contactEmail: "sneha.k@postman.com",
      contactPhone: "+91 98200 66554",
      shippingAddress: "Bandra Kurla Complex, Mumbai - 400051",
      stage: "DISPATCHED",
      priority: "URGENT",
      targetDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      totalAmount: 362500,
      advancePaid: 362500,
      balanceDue: 0,
      paymentStatus: "FULLY_PAID",
      jobSheetNumber: "JS-2026-0082",
      notes: "Delivered to Mumbai office. Conference event on Friday.",
      items: {
        create: [
          {
            productName: "The Founder's Welcome Kit Alpha",
            sku: "UD-KIT-001",
            sizeBreakdown: JSON.stringify({ FREE_SIZE: 250 }),
            quantity: 250,
            unitPrice: 1450,
            customizationDetails: "Postman Orange Brand Foil Box + Personalized Note Card",
            lineTotal: 362500,
          },
        ],
      },
      qualityCheck: {
        create: {
          fabricQualityChecked: true,
          printFidelityChecked: true,
          colorAccuracyChecked: true,
          stitchingFinishChecked: true,
          packagingChecked: true,
          passed: true,
          inspectedBy: "Vikram Rathore",
          remarks: "Rigid box corners inspected. Foil stamp tested for adhesion.",
          checkedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      },
      shipment: {
        create: {
          courierPartner: "Blue Dart Express",
          trackingNumber: "BD-904128551",
          dispatchDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          packageCount: 15,
          totalWeightKg: 185.0,
          status: "IN_TRANSIT",
          trackingUrl: "https://www.bluedart.com/tracking?awb=BD-904128551",
        },
      },
    },
  });

  // 9. Seed Activity Log
  await Promise.all([
    prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: order1.id,
        action: "STAGE_CHANGED",
        description: "Order UD-ORD-2026-0014 stage moved to IN_PRODUCTION (Fabric cutting started)",
        performedBy: "Vikram Rathore",
      },
    }),
    prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: order2.id,
        action: "QC_PASSED",
        description: "Order UD-ORD-2026-0015 completed 5-Point Quality Check successfully. Ready for dispatch.",
        performedBy: "Vikram Rathore",
      },
    }),
    prisma.activityLog.create({
      data: {
        entityType: "QUOTE",
        entityId: quote2.id,
        action: "CREATED",
        description: "Quotation UD-QT-2026-0042 generated for Razorpay Software (₹4,50,072)",
        performedBy: "Pooja Nair",
      },
    }),
    prisma.activityLog.create({
      data: {
        entityType: "LEAD",
        entityId: "LD-1044",
        action: "CREATED",
        description: "New inbound lead from Peak XV Partners (120 Bomber Jackets)",
        performedBy: "Website Ingestion",
      },
    }),
  ]);

  console.log("Urban Dhaga database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

