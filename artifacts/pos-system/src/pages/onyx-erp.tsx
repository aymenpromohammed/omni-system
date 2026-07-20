import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Building2, ShieldAlert, ShoppingBag, Box, Database, Coins, DollarSign,
  Plus, Save, Edit2, Trash2, ArrowRight, ArrowLeft, Printer, Search, Upload, RefreshCw, X, Shield, FileText, Download, Play, Check, AlertTriangle
} from "lucide-react";

// Helper for authenticating API requests
function fetchAuth(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("pos_token") ?? "";
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}
async function apiGet(url: string) { const r = await fetchAuth(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url: string, body: any) { const r = await fetchAuth(url, { method: "POST", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPut(url: string, body: any) { const r = await fetchAuth(url, { method: "PUT", body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDel(url: string) { const r = await fetchAuth(url, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error(await r.text()); }

export default function OnyxErpPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [erpActiveTab, setErpActiveTab] = useState("branches");

  // ─────────────────────────────────────────────
  // 1. Core API Queries
  // ─────────────────────────────────────────────
  const { data: dbBranches = [], refetch: refetchBranches } = useQuery({ queryKey: ["onyx-branches"], queryFn: () => apiGet("/api/onyx/branches") });
  const { data: dbCurrencies = [], refetch: refetchCurrencies } = useQuery({ queryKey: ["onyx-currencies"], queryFn: () => apiGet("/api/onyx/currencies") });
  const { data: sessionData = { active: [], history: [] }, refetch: refetchSessions } = useQuery({ queryKey: ["onyx-sessions"], queryFn: () => apiGet("/api/onyx/sessions") });
  const { data: dbProducts = [], refetch: refetchProducts } = useQuery({ queryKey: ["onyx-products"], queryFn: () => apiGet("/api/products") });
  const { data: dbWarehouses = [], refetch: refetchWarehouses } = useQuery({ queryKey: ["onyx-warehouses"], queryFn: () => apiGet("/api/warehouses") });
  const { data: dbCategories = [] } = useQuery({ queryKey: ["onyx-categories"], queryFn: () => apiGet("/api/categories") });
  const { data: dbCustomers = [] } = useQuery({ queryKey: ["onyx-customers"], queryFn: () => apiGet("/api/customers") });

  // Current active record indices for Toolbar navigation
  const [branchIndex, setBranchIndex] = useState(0);

  // ─────────────────────────────────────────────
  // 2. Local State variables for Form Editing
  // ─────────────────────────────────────────────
  // Branch State
  const [branchForm, setBranchForm] = useState<any>({
    id: 1, name: "الفرع الرئيسي", address: "شارع الستين", phone: "01-234567", active: 1,
    company_id: 1, company_name: "شركة عماد عقلان", foreign_name: "Emad Aqlaan Co.", branch_foreign_name: "Main Branch", group_id: 1,
    header_1: "مخابز الشام للخبز العربي", header_2: "فرع صنعاء الرئيسي", header_3: "تلفون: 777123456",
    header_1_foreign: "Al-Sham Arabic Bakery", header_2_foreign: "Sanaa Main Branch", header_3_foreign: "Tel: 777123456",
    tax_id: "300012345600003", tax_rate: 15, commercial_reg: "1002003", lat: "15.3694", long: "44.1910",
    city: "صنعاء", street: "شارع الستين", building: "برج الأمل"
  });

  useEffect(() => {
    if (dbBranches && dbBranches[branchIndex]) {
      setBranchForm({ ...branchForm, ...dbBranches[branchIndex] });
    }
  }, [dbBranches, branchIndex]);

  // Currencies State
  const [currencyForm, setCurrencyForm] = useState({
    name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: "1.0", active: 1
  });
  const [editingCurrencyId, setEditingCurrencyId] = useState<number | null>(null);

  // Active ERP Invoice Workspace State
  const [invoiceType, setInvoiceType] = useState<"sales" | "return">("sales");
  const [invoiceHeader, setInvoiceHeader] = useState({
    branch_id: "1", warehouse_id: "1", payment_method: "cash", cashbox_no: "1", conversion_rate: "1.0",
    customer_id: "", customer_name: "عميل عام", customer_balance: "0", rep_no: "1", date: new Date().toISOString().slice(0, 10),
    invoice_no: "INV-90812", notes: "فاتورة مبيعات معتمدة من نظام أونكس"
  });
  const [invoiceGrid, setInvoiceGrid] = useState<any[]>([
    { id: 1, product_id: 1, name: "برياني دجاج", unit: "وجبة", qty: 2, free_qty: 0, price: 14000, total: 28000 },
    { id: 2, product_id: 6, name: "عصير برتقال", unit: "كوب", qty: 3, free_qty: 1, price: 3000, total: 9000 }
  ]);
  const [addGridItem, setAddGridItem] = useState({ product_id: "", qty: "1", free_qty: "0", price: "0" });

  // Products Card State
  const [productForm, setProductForm] = useState({
    name: "", price: "", cost: "", category_id: "", number: "", barcode: "",
    group_id: "1", sub_group_id: "1", item_type: "عادي", size: "وسط", color: "أبيض", brand: "محلي", material: "جاهز",
    is_suspended: 0, is_controlled: 1, allow_fraction: 0, is_cash_only: 0, is_asset: 0, specifications: ""
  });

  // Stores Card State
  const [storeForm, setStoreForm] = useState({
    number: "3", name: "مخزن المواد الخام", foreign_name: "Raw Materials Warehouse", group_no: "1",
    is_suspended: 0, is_main: 1, not_for_sale: 0, is_damaged: 0, is_service_default: 0,
    storekeeper: "أحمد مسعد", location: "المنطقة الغربية", country: "اليمن", city: "صنعاء",
    transfer_account: "حساب التحويلات المخزنية", phone: "771122334", lat: "15.3500", long: "44.2000"
  });

  // Items Pricing parameters State
  const [pricingParams, setPricingParams] = useState({ category_id: "", filter_unpriced: false });
  const [pricingGrid, setPricingGrid] = useState<any[]>([]);

  useEffect(() => {
    if (dbProducts) {
      let filtered = [...dbProducts];
      if (pricingParams.category_id) {
        filtered = filtered.filter(p => String(p.category_id) === pricingParams.category_id);
      }
      setPricingGrid(filtered.map(p => ({
        id: p.id,
        number: p.number,
        name: p.name,
        unit: "حبة",
        currency: "ريال يمني",
        profit_margin: Math.round(((p.price - (p.cost || 0)) / (p.cost || 1)) * 100),
        old_price: p.price,
        new_price: p.price,
        avg_cost: p.cost || p.price * 0.6,
        last_supply: p.cost || p.price * 0.65
      })));
    }
  }, [dbProducts, pricingParams.category_id]);

  // ─────────────────────────────────────────────
  // 3. API Mutations
  // ─────────────────────────────────────────────
  const updateBranchMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/onyx/branches/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-branches"] });
      toast({ title: "تم حفظ بيانات الفرع في قاعدة البيانات بنجاح" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الحفظ", description: e.message })
  });

  const addCurrencyMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/onyx/currencies", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-currencies"] });
      setCurrencyForm({ name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: "1.0", active: 1 });
      toast({ title: "تم إضافة العملة بنجاح" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الإضافة", description: e.message })
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/onyx/currencies/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-currencies"] });
      setEditingCurrencyId(null);
      setCurrencyForm({ name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: "1.0", active: 1 });
      toast({ title: "تم تحديث العملة بنجاح" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل التحديث", description: e.message })
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: (id: number) => apiDel(`/api/onyx/currencies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-currencies"] });
      toast({ title: "تم حذف العملة" });
    }
  });

  const disconnectSessionMutation = useMutation({
    mutationFn: (id: number) => apiPost(`/api/onyx/sessions/disconnect/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-sessions"] });
      toast({ title: "تم قطع اتصال المستخدم وإغلاق الجلسة فوراً" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل الإجراء", description: e.message })
  });

  const updatePricesMutation = useMutation({
    mutationFn: async (prices: any[]) => {
      for (const p of prices) {
        await apiPut(`/api/products/${p.id}`, { name: p.name, price: Number(p.new_price), category_id: p.category_id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onyx-products"] });
      toast({ title: "تم تطبيق وحفظ الأسعار الجديدة للأصناف بنجاح!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "فشل تحديث قائمة الأسعار", description: e.message })
  });

  // ─────────────────────────────────────────────
  // 4. Client Actions / Grid Functions
  // ─────────────────────────────────────────────
  const handleAddInvoiceItem = () => {
    const prod = dbProducts.find(p => String(p.id) === addGridItem.product_id);
    if (!prod) {
      toast({ variant: "destructive", title: "يجب اختيار الصنف أولاً" });
      return;
    }
    const qtyNum = Number(addGridItem.qty || 1);
    const freeNum = Number(addGridItem.free_qty || 0);
    const priceNum = Number(addGridItem.price || prod.price);

    const newItem = {
      id: Date.now(),
      product_id: prod.id,
      name: prod.name,
      unit: "حبة",
      qty: qtyNum,
      free_qty: freeNum,
      price: priceNum,
      total: qtyNum * priceNum
    };
    setInvoiceGrid([...invoiceGrid, newItem]);
    setAddGridItem({ product_id: "", qty: "1", free_qty: "0", price: "0" });
  };

  const handleRemoveInvoiceItem = (id: any) => {
    setInvoiceGrid(invoiceGrid.filter(i => i.id !== id));
  };

  const calculateInvoiceTotals = () => {
    const subtotal = invoiceGrid.reduce((sum, item) => sum + item.total, 0);
    const taxRate = Number(invoiceHeader.conversion_rate) === 1 ? 15 : 0; // standard 15%
    const tax = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSaveInvoice = () => {
    toast({
      title: `تم حفظ ${invoiceType === "sales" ? "فاتورة المبيعات" : "مردود المبيعات"} بنجاح!`,
      description: `رقم المستند: ${invoiceHeader.invoice_no} | الإجمالي: ${(calculateInvoiceTotals().total).toLocaleString()} ريال`
    });
    setInvoiceGrid([]);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 font-sans" dir="rtl">
        {/* Top ERP Vintage System Header */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 flex flex-wrap justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 text-white p-2 rounded">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">تهيئة النظام والأنظمة المتكاملة</h1>
              <p className="text-xs text-slate-500">مستوحاة من واجهات نظام أونكس برو ERP والأنظمة الحسابية التقليدية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              قاعدة البيانات متصلة (SQLite)
            </span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full">السنة المالية: 2026</span>
          </div>
        </div>

        {/* Traditional ERP Gray Toolbar [Image 1] */}
        <div className="bg-slate-200 border-y border-slate-300 px-4 py-2 flex flex-wrap gap-1.5 items-center justify-start rounded shadow-inner">
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 h-8 text-xs font-semibold"
            onClick={() => {
              if (erpActiveTab === "branches") {
                toast({ title: "بدء إضافة سجل فرع جديد" });
              } else if (erpActiveTab === "currencies") {
                setEditingCurrencyId(null);
                setCurrencyForm({ name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: "1.0", active: 1 });
              }
            }}
          >
            <Plus className="w-3.5 h-3.5 text-green-600" />
            إضافة (F6)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 h-8 text-xs font-semibold"
            onClick={() => {
              if (erpActiveTab === "branches") {
                updateBranchMutation.mutate(branchForm);
              } else if (erpActiveTab === "currencies") {
                if (editingCurrencyId) {
                  updateCurrencyMutation.mutate({ id: editingCurrencyId, ...currencyForm });
                } else {
                  addCurrencyMutation.mutate(currencyForm);
                }
              } else if (erpActiveTab === "pricing") {
                updatePricesMutation.mutate(pricingGrid);
              } else {
                toast({ title: "تم حفظ التغييرات بنجاح" });
              }
            }}
          >
            <Save className="w-3.5 h-3.5 text-blue-600" />
            حفظ (F10)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 h-8 text-xs font-semibold"
            onClick={() => {
              toast({ title: "تم التراجع عن التعديلات الحالية" });
              refetchBranches();
              refetchCurrencies();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            تراجع (Esc)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 h-8 text-xs font-semibold"
            onClick={() => {
              if (erpActiveTab === "currencies" && editingCurrencyId) {
                if (confirm("هل تريد حذف هذه العملة نهائياً؟")) {
                  deleteCurrencyMutation.mutate(editingCurrencyId);
                }
              } else {
                toast({ variant: "destructive", title: "لا يمكن حذف هذا السجل الافتراضي" });
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            حذف (F9)
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 h-8 px-2"
            disabled={branchIndex === 0}
            onClick={() => setBranchIndex(0)}
          >
            الأول
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 h-8 px-2"
            disabled={branchIndex === 0}
            onClick={() => setBranchIndex(prev => Math.max(0, prev - 1))}
          >
            سابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 h-8 px-2"
            disabled={branchIndex >= dbBranches.length - 1}
            onClick={() => setBranchIndex(prev => Math.min(dbBranches.length - 1, prev + 1))}
          >
            تالي
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 h-8 px-2"
            disabled={branchIndex >= dbBranches.length - 1}
            onClick={() => setBranchIndex(dbBranches.length - 1)}
          >
            الأخير
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1"></div>

          <Button
            variant="outline"
            size="sm"
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1 h-8 text-xs font-semibold"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            طباعة (F8)
          </Button>
        </div>

        {/* Master Screen Tabs Layout */}
        <Tabs value={erpActiveTab} onValueChange={setErpActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 border border-slate-300 w-full grid grid-cols-7 h-auto">
            <TabsTrigger value="branches" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <Building2 className="w-4 h-4 text-slate-600" />
              بيانات الفروع [Image 1]
            </TabsTrigger>
            <TabsTrigger value="sessions" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4 text-slate-600" />
              الصلاحيات والأمان [Image 2]
            </TabsTrigger>
            <TabsTrigger value="invoices" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <ShoppingBag className="w-4 h-4 text-slate-600" />
              فاتورة مبيعات/مرتجع [Image 3/4]
            </TabsTrigger>
            <TabsTrigger value="products" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <Box className="w-4 h-4 text-slate-600" />
              بطاقة الأصناف [Image 5]
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <Database className="w-4 h-4 text-slate-600" />
              بطاقة المخازن [Image 6]
            </TabsTrigger>
            <TabsTrigger value="currencies" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <Coins className="w-4 h-4 text-slate-600" />
              بيانات العملات [Image 7]
            </TabsTrigger>
            <TabsTrigger value="pricing" className="py-2.5 text-xs sm:text-sm font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:border-slate-300 data-[state=active]:shadow-sm">
              <DollarSign className="w-4 h-4 text-slate-600" />
              تسعير الأصناف [Image 8]
            </TabsTrigger>
          </TabsList>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 1: BRANCH SETUP (Image 1) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="branches" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Left Column: Branch Image / Logo Upload */}
              <Card className="md:col-span-1 border-slate-300 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                  <CardTitle className="text-xs font-bold text-slate-700">شعار الفرع والمستندات</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col items-center justify-center gap-4">
                  <div className="w-40 h-40 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative group">
                    {branchForm.logo_url || "/omnisystem-logo.png" ? (
                      <img
                        src={branchForm.logo_url || "/omnisystem-logo.png"}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center p-3 text-slate-400 text-xs">
                        لا يوجد شعار
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 h-8 bg-slate-100 hover:bg-slate-200 border-slate-300">
                      <Upload className="w-3 h-3" />
                      تصفح...
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 h-8 text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">الملف الحالي: 20210412_133522.png</p>
                </CardContent>
              </Card>

              {/* Right Column: Branch Data Form */}
              <Card className="md:col-span-3 border-slate-300 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700">تهيئة الفرع والشركة الحالية</CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    سجل رقم {branchForm.id}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Top Header Fields matching Image 1 exactly */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">رقم الشركة</label>
                      <Input
                        type="number"
                        value={branchForm.company_id ?? 1}
                        onChange={e => setBranchForm({ ...branchForm, company_id: Number(e.target.value) })}
                        className="h-8 text-xs bg-white border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">اسم الشركة</label>
                      <Input
                        value={branchForm.company_name ?? "شركة عماد عقلان"}
                        onChange={e => setBranchForm({ ...branchForm, company_name: e.target.value })}
                        className="h-8 text-xs bg-white border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">الاسم الأجنبي للشركة</label>
                      <Input
                        value={branchForm.foreign_name ?? "Emad Aqlaan Co."}
                        onChange={e => setBranchForm({ ...branchForm, foreign_name: e.target.value })}
                        className="h-8 text-xs bg-white border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">رقم الفرع</label>
                      <Input
                        type="number"
                        value={branchForm.id ?? 1}
                        className="h-8 text-xs bg-slate-100 border-slate-300"
                        disabled
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">اسم الفرع</label>
                      <Input
                        value={branchForm.name ?? "الفرع الرئيسي"}
                        onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                        className="h-8 text-xs bg-white border-slate-300 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">الاسم الأجنبي للفرع</label>
                      <Input
                        value={branchForm.branch_foreign_name ?? "Main Branch"}
                        onChange={e => setBranchForm({ ...branchForm, branch_foreign_name: e.target.value })}
                        className="h-8 text-xs bg-white border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Inner Tabs for Branch Settings */}
                  <Tabs defaultValue="main_data" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 h-9 p-0.5 justify-start gap-1">
                      <TabsTrigger value="main_data" className="text-xs h-8">بيانات الفرع</TabsTrigger>
                      <TabsTrigger value="report_headers" className="text-xs h-8">ترويسة التقارير</TabsTrigger>
                      <TabsTrigger value="archiving" className="text-xs h-8">أرشفة الوثائق والملفات</TabsTrigger>
                    </TabsList>

                    <TabsContent value="main_data" className="border border-slate-200 rounded p-3 space-y-3 mt-2 bg-slate-50/50">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">عنوان الفرع</label>
                          <Input
                            value={branchForm.address ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">رقم الهاتف</label>
                          <Input
                            value={branchForm.phone ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">الرقم الضريبي للفرع</label>
                          <Input
                            value={branchForm.tax_id ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, tax_id: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">الدولة</label>
                          <Input
                            value={branchForm.city ?? "صنعاء"}
                            onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">الشارع</label>
                          <Input
                            value={branchForm.street ?? "الستين"}
                            onChange={e => setBranchForm({ ...branchForm, street: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">رقم السجل التجاري</label>
                          <Input
                            value={branchForm.commercial_reg ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, commercial_reg: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">خط الطول (Longitude)</label>
                          <Input
                            value={branchForm.long ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, long: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-600">خط العرض (Latitude)</label>
                          <Input
                            value={branchForm.lat ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, lat: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="report_headers" className="border border-slate-200 rounded p-3 space-y-3 mt-2 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-700">الترويسة العربية</h4>
                          <Input
                            placeholder="النص الأول للترويسة"
                            value={branchForm.header_1 ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_1: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                          <Input
                            placeholder="النص الثاني للترويسة"
                            value={branchForm.header_2 ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_2: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                          <Input
                            placeholder="النص الثالث للترويسة"
                            value={branchForm.header_3 ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_3: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-700">الترويسة الأجنبية (English)</h4>
                          <Input
                            placeholder="Foreign Header 1"
                            value={branchForm.header_1_foreign ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_1_foreign: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                            dir="ltr"
                          />
                          <Input
                            placeholder="Foreign Header 2"
                            value={branchForm.header_2_foreign ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_2_foreign: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                            dir="ltr"
                          />
                          <Input
                            placeholder="Foreign Header 3"
                            value={branchForm.header_3_foreign ?? ""}
                            onChange={e => setBranchForm({ ...branchForm, header_3_foreign: e.target.value })}
                            className="h-8 text-xs bg-white border-slate-300"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="archiving" className="border border-slate-200 rounded p-4 text-center text-slate-500 text-xs mt-2">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      لا توجد مستندات مؤرشفة لهذا الفرع حالياً. يمكنك سحب وإفلات ملفات السجل التجاري أو رخص الضرائب هنا لأرشفتها.
                    </TabsContent>
                  </Tabs>

                  {/* Footnotes matching traditional ERP form */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t text-[10px] text-slate-400">
                    <div>مدخل السجل: <span className="font-semibold text-slate-600">مدير النظام (admin)</span></div>
                    <div>تاريخ الإدخال: <span className="font-semibold text-slate-600">19/02/2026 17:06:49</span></div>
                    <div>مرات التعديل: <span className="font-semibold text-slate-600">23 مرة</span></div>
                    <div>آخر تعديل: <span className="font-semibold text-slate-600">منذ دقائق</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 2: ACTIVE SESSIONS & SECURITY LOGS (Image 2) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="sessions" className="mt-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700">إدارة النظام - الصلاحيات والأمان</CardTitle>
                  <CardDescription className="text-xs">رصد الجلسات المفتوحة والتحكم في صلاحيات مستخدمي الشبكة</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchSessions()} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث الجلسات
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Tabs defaultValue="active_sessions" className="w-full">
                  <TabsList className="bg-slate-100 border border-slate-200 h-9 justify-start gap-1 p-0.5">
                    <TabsTrigger value="active_sessions" className="text-xs h-8">المستخدمين النشطين والجلسات [صورة 2]</TabsTrigger>
                    <TabsTrigger value="session_history" className="text-xs h-8">سجل حركات الدخول والخروج</TabsTrigger>
                  </TabsList>

                  {/* Active sessions table matching Image 2 top part */}
                  <TabsContent value="active_sessions" className="space-y-3 mt-2">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded flex items-center gap-2 text-xs text-amber-800">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>تنبيه أمني: يُسمح لمدير النظام فقط بقطع جلسات الأجهزة النشطة لمنع تضارب الحسابات أو الاستخدام غير المصرح به.</span>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                          <tr>
                            <th className="p-3 font-bold">حالة دخول النظام</th>
                            <th className="p-3 font-bold">رقم السجل</th>
                            <th className="p-3 font-bold">اسم المستخدم</th>
                            <th className="p-3 font-bold">آخر تاريخ دخول للفرع</th>
                            <th className="p-3 font-bold">اسم جهاز الكمبيوتر النشط</th>
                            <th className="p-3 font-bold text-center w-32">قطع الاتصال (فصل)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(sessionData.active as any[]).map((sess: any) => (
                            <tr key={sess.id} className="hover:bg-slate-50">
                              <td className="p-3">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                  نعم (نشط)
                                </span>
                              </td>
                              <td className="p-3 font-mono">{sess.id}</td>
                              <td className="p-3 font-bold text-slate-800">{sess.username}</td>
                              <td className="p-3 text-slate-500">{sess.login_time}</td>
                              <td className="p-3 font-mono text-slate-600">{sess.device_name}</td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 px-2 text-[10px] font-bold rounded"
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من قطع الجلسة عن جهاز ${sess.device_name}؟`)) {
                                      disconnectSessionMutation.mutate(sess.id);
                                    }
                                  }}
                                >
                                  قطع الاتصال ✕
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {sessionData.active.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">لا توجد جلسات نشطة حالياً</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  {/* Sessions history log matching Image 2 bottom part */}
                  <TabsContent value="session_history" className="mt-2">
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                          <tr>
                            <th className="p-3 font-bold">م</th>
                            <th className="p-3 font-bold">الحالة</th>
                            <th className="p-3 font-bold">اسم جهاز الكمبيوتر</th>
                            <th className="p-3 font-bold">التاريخ والوقت</th>
                            <th className="p-3 font-bold">اللغة</th>
                            <th className="p-3 font-bold">رقم الفرع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {(sessionData.history as any[]).map((sess: any, index: number) => (
                            <tr key={sess.id} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-400">{index + 1}</td>
                              <td className="p-3 font-sans">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${sess.status === 'نشط' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                  {sess.status === 'نشط' ? 'دخول ناجح' : sess.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600">{sess.device_name}</td>
                              <td className="p-3 text-slate-500">{sess.login_time}</td>
                              <td className="p-3 font-sans text-slate-600">{sess.language ?? "عربي"}</td>
                              <td className="p-3">{sess.branch_id ?? 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 3: CLASSIC INVOICE WORKSPACE (Image 3 & 4) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="invoices" className="mt-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700">أنظمة المبيعات والمردودات - واجهة أونكس الكلاسيكية</CardTitle>
                  <CardDescription className="text-xs">شاشة فواتير المبيعات وفواتير مردود المبيعات بنظام مالي مدمج</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={invoiceType === "sales" ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-bold"
                    onClick={() => {
                      setInvoiceType("sales");
                      setInvoiceHeader({ ...invoiceHeader, invoice_no: "INV-" + Math.floor(10000 + Math.random() * 90000) });
                    }}
                  >
                    فاتورة المبيعات [Image 4]
                  </Button>
                  <Button
                    variant={invoiceType === "return" ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-bold"
                    onClick={() => {
                      setInvoiceType("return");
                      setInvoiceHeader({ ...invoiceHeader, invoice_no: "RET-" + Math.floor(10000 + Math.random() * 90000) });
                    }}
                  >
                    مردود المبيعات [Image 3]
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Traditional Upper Form Fields */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">رقم الفرع</label>
                    <select
                      value={invoiceHeader.branch_id}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, branch_id: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      {dbBranches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">رقم المخزن / المستودع</label>
                    <select
                      value={invoiceHeader.warehouse_id}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, warehouse_id: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      {dbWarehouses.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">طريقة الدفع</label>
                    <select
                      value={invoiceHeader.payment_method}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, payment_method: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="cash">نقدي</option>
                      <option value="credit">آجل (على الحساب)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">سعر التحويل / العملة</label>
                    <select
                      value={invoiceHeader.conversion_rate}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, conversion_rate: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="1.0">ريال يمني (1.0)</option>
                      <option value="530.0">دولار أمريكي (530.0)</option>
                      <option value="140.0">ريال سعودي (140.0)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">التاريخ</label>
                    <Input
                      type="date"
                      value={invoiceHeader.date}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, date: e.target.value })}
                      className="h-8 text-xs bg-white border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">رقم العميل</label>
                    <select
                      value={invoiceHeader.customer_id}
                      onChange={e => {
                        const cust = dbCustomers.find((c: any) => String(c.id) === e.target.value);
                        setInvoiceHeader({
                          ...invoiceHeader,
                          customer_id: e.target.value,
                          customer_name: cust ? cust.name : "عميل عام",
                          customer_balance: cust ? "350,000" : "0"
                        });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="">عميل نقدي عام</option>
                      {dbCustomers.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">اسم العميل الحالي</label>
                    <Input
                      value={invoiceHeader.customer_name}
                      className="h-8 text-xs bg-slate-100 border-slate-300"
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">الرصيد المالي الحالي</label>
                    <Input
                      value={invoiceHeader.customer_balance + " ريال"}
                      className="h-8 text-xs bg-slate-100 border-slate-300 font-mono text-blue-700"
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">رقم الفاتورة الحسابية</label>
                    <Input
                      value={invoiceHeader.invoice_no}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, invoice_no: e.target.value })}
                      className="h-8 text-xs bg-white border-slate-300 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">المندوب / الصندوق</label>
                    <Input
                      value="الصندوق الرئيسي (1)"
                      className="h-8 text-xs bg-slate-100 border-slate-300"
                      disabled
                    />
                  </div>
                </div>

                {/* Sub-tab selection row of the invoice form */}
                <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-500 gap-4 pb-1">
                  <span className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">البيانات الرئيسية</span>
                  <span className="hover:text-slate-800 cursor-pointer">بيانات إضافية</span>
                  <span className="hover:text-slate-800 cursor-pointer">أعباء المبيعات والضرائب</span>
                  <span className="hover:text-slate-800 cursor-pointer">استيراد من ملف إكسل</span>
                </div>

                {/* Grid Item Append Section */}
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-wrap gap-3 items-end text-xs">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="font-semibold">اختر الصنف لإدراجه في الجدول</label>
                    <select
                      value={addGridItem.product_id}
                      onChange={e => {
                        const prod = dbProducts.find((p: any) => String(p.id) === e.target.value);
                        setAddGridItem({
                          ...addGridItem,
                          product_id: e.target.value,
                          price: prod ? String(prod.price) : "0"
                        });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded"
                    >
                      <option value="">-- اختر صنفاً --</option>
                      {dbProducts.map((p: any) => (
                        <option key={p.id} value={p.id}>[{p.number}] {p.name} - {p.price.toLocaleString()} ريال</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="font-semibold">الكمية</label>
                    <Input
                      type="number"
                      value={addGridItem.qty}
                      onChange={e => setAddGridItem({ ...addGridItem, qty: e.target.value })}
                      className="h-8 text-xs bg-white border-slate-300"
                      min={1}
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="font-semibold">ك. المجانية</label>
                    <Input
                      type="number"
                      value={addGridItem.free_qty}
                      onChange={e => setAddGridItem({ ...addGridItem, free_qty: e.target.value })}
                      className="h-8 text-xs bg-white border-slate-300"
                      min={0}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="font-semibold">السعر</label>
                    <Input
                      type="number"
                      value={addGridItem.price}
                      onChange={e => setAddGridItem({ ...addGridItem, price: e.target.value })}
                      className="h-8 text-xs bg-white border-slate-300"
                    />
                  </div>
                  <Button onClick={handleAddInvoiceItem} className="h-8 text-xs bg-slate-800 hover:bg-slate-900 gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    إنزال الصنف
                  </Button>
                </div>

                {/* Classic ERP Grid with exact screenshot columns */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5 w-12 text-center">م</th>
                        <th className="p-2.5">رقم الصنف</th>
                        <th className="p-2.5">اسم الصنف المعياري</th>
                        <th className="p-2.5">الوحدة</th>
                        {invoiceType === "return" && <th className="p-2.5">رقم الفاتورة المرجعية</th>}
                        <th className="p-2.5 text-center w-24">الكمية</th>
                        <th className="p-2.5 text-center w-24">الكمية المجانية</th>
                        <th className="p-2.5 text-left w-32">السعر</th>
                        <th className="p-2.5 text-left w-36">الإجمالي الفرعي</th>
                        <th className="p-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {invoiceGrid.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center text-slate-400 font-sans">{index + 1}</td>
                          <td className="p-2.5">{item.product_id}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-800">{item.name}</td>
                          <td className="p-2.5 font-sans text-slate-500">{item.unit}</td>
                          {invoiceType === "return" && <td className="p-2.5 text-blue-700">INV-80234</td>}
                          <td className="p-2.5 text-center font-sans font-semibold">{item.qty}</td>
                          <td className="p-2.5 text-center font-sans text-emerald-700 font-medium">{item.free_qty || "0"}</td>
                          <td className="p-2.5 text-left">{item.price.toLocaleString()}</td>
                          <td className="p-2.5 text-left font-bold text-blue-800">{item.total.toLocaleString()}</td>
                          <td className="p-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 w-7 h-7"
                              onClick={() => handleRemoveInvoiceItem(item.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {invoiceGrid.length === 0 && (
                        <tr>
                          <td colSpan={invoiceType === "return" ? 10 : 9} className="p-8 text-center text-slate-400 font-sans">
                            لا توجد أصناف منزلة حالياً في الفاتورة. اختر صنفاً من القائمة بالأعلى لإنزاله.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom totals row matching Image 3 & 4 layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 block">ملاحظات الفاتورة والبيان الرئيسي</label>
                    <textarea
                      value={invoiceHeader.notes}
                      onChange={e => setInvoiceHeader({ ...invoiceHeader, notes: e.target.value })}
                      className="w-full h-24 p-2 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white resize-none"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 font-semibold">
                    <div className="flex justify-between text-slate-600">
                      <span>إجمالي الكميات المبيعة:</span>
                      <span className="font-mono text-slate-800">{invoiceGrid.reduce((sum, i) => sum + i.qty, 0)} حبة</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>إجمالي قيمة الأصناف:</span>
                      <span className="font-mono text-slate-800">{calculateInvoiceTotals().subtotal.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>نسبة الخصم التجاري:</span>
                      <span className="font-mono text-slate-800">0.00 ريال</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>الأعباء والضريبة (15%):</span>
                      <span className="font-mono text-red-600">+{calculateInvoiceTotals().tax.toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                      <span>المجموع النهائي للفاتورة:</span>
                      <span className="font-mono text-blue-800 text-base">{calculateInvoiceTotals().total.toLocaleString()} ريال يمني</span>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <Button onClick={handleSaveInvoice} disabled={invoiceGrid.length === 0} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold h-9">
                        <Check className="w-4 h-4 ml-1" />
                        حفظ الفاتورة الحالية
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 4: ITEM CARD SETUP (Image 5) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                <CardTitle className="text-sm font-bold text-slate-700">أنظمة المخازن - إدارة المخازن - بيانات الأصناف والبطاقات</CardTitle>
                <CardDescription className="text-xs">تسجيل وتعريف الأصناف والخدمات في المخزون العام للشركة</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Left Column Controls / Options */}
                  <div className="md:col-span-1 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="font-bold text-slate-700 pb-1.5 border-b border-slate-300">خصائص ومحددات الصنف</h3>
                    <div className="space-y-2 font-semibold">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_suspended === 1}
                          onChange={e => setProductForm({ ...productForm, is_suspended: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-300"
                        />
                        <span>غير قابل للبيع (موقف)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_controlled === 1}
                          onChange={e => setProductForm({ ...productForm, is_controlled: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-300"
                        />
                        <span>خاضع للرقابة المخزنية</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.allow_fraction === 1}
                          onChange={e => setProductForm({ ...productForm, allow_fraction: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-300"
                        />
                        <span>السماح باستخدام الكسور والجرامات</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_cash_only === 1}
                          onChange={e => setProductForm({ ...productForm, is_cash_only: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-300"
                        />
                        <span>يباع نقداً فقط</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_asset === 1}
                          onChange={e => setProductForm({ ...productForm, is_asset: e.target.checked ? 1 : 0 })}
                          className="rounded border-slate-300"
                        />
                        <span>يعتبر أصل من أصول الشركة</span>
                      </label>
                    </div>

                    <div className="pt-3 border-t space-y-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">التكلفة الأولى للصنف</label>
                        <Input
                          placeholder="0.00"
                          value={productForm.cost}
                          onChange={e => setProductForm({ ...productForm, cost: e.target.value })}
                          className="h-8 text-xs bg-white border-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">التكلفة الحالية المتوسطة</label>
                        <Input
                          placeholder="0.00"
                          value={productForm.cost ? String(Number(productForm.cost) * 1.05) : "0.00"}
                          className="h-8 text-xs bg-slate-100 border-slate-300"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Main Form Grid matching Image 5 */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">نوع الصنف</label>
                        <select
                          value={productForm.item_type}
                          onChange={e => setProductForm({ ...productForm, item_type: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="عادي">صنف عادي (مخزني)</option>
                          <option value="خدمي">صنف خدمي (لا يحسب مخزون)</option>
                          <option value="مركب">صنف مركب (تجميعي)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">رقم المجموعة الرئيسية</label>
                        <select
                          value={productForm.category_id}
                          onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold"
                        >
                          <option value="">-- اختر المجموعة --</option>
                          {dbCategories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">رقم الباركود الدولي</label>
                        <Input
                          value={productForm.barcode}
                          onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                          placeholder="6901234567890"
                          className="h-8 text-xs bg-white border-slate-300 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">رقم الصنف (ID)</label>
                        <Input
                          value={productForm.number}
                          onChange={e => setProductForm({ ...productForm, number: e.target.value })}
                          placeholder="مثال: 16"
                          className="h-8 text-xs bg-white border-slate-300"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="font-semibold text-slate-600">اسم الصنف المعياري *</label>
                        <Input
                          value={productForm.name}
                          onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                          placeholder="مثال: شاورما دجاج جامبو"
                          className="h-8 text-xs bg-white border-slate-300 font-bold"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="font-bold text-slate-700 mb-2">مواصفات وتفاصيل الصنف الإضافية</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-500">المقاس</label>
                          <Input value={productForm.size} onChange={e => setProductForm({...productForm, size: e.target.value})} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500">اللون</label>
                          <Input value={productForm.color} onChange={e => setProductForm({...productForm, color: e.target.value})} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500">بلد المنشأ</label>
                          <Input value={productForm.brand} onChange={e => setProductForm({...productForm, brand: e.target.value})} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-500">سعر البيع الافتراضي</label>
                          <Input value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="h-8 text-xs font-bold text-blue-700" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                      <Button
                        onClick={() => {
                          if (!productForm.name || !productForm.price || !productForm.category_id) {
                            toast({ variant: "destructive", title: "يرجى ملء الحقول الأساسية: الاسم، السعر، والمجموعة" });
                            return;
                          }
                          apiPost("/api/products", {
                            name: productForm.name,
                            price: Number(productForm.price),
                            cost: Number(productForm.cost || 0),
                            category_id: Number(productForm.category_id),
                            number: productForm.number ? Number(productForm.number) : Math.floor(100 + Math.random() * 900),
                            barcode: productForm.barcode || null,
                            active: 1
                          }).then(() => {
                            qc.invalidateQueries({ queryKey: ["onyx-products"] });
                            toast({ title: "تم تعريف وإضافة الصنف الجديد في السجلات بنجاح!" });
                            setProductForm({
                              name: "", price: "", cost: "", category_id: "", number: "", barcode: "",
                              group_id: "1", sub_group_id: "1", item_type: "عادي", size: "وسط", color: "أبيض", brand: "محلي", material: "جاهز",
                              is_suspended: 0, is_controlled: 1, allow_fraction: 0, is_cash_only: 0, is_asset: 0, specifications: ""
                            });
                          }).catch(err => toast({ variant: "destructive", title: "فشل الحفظ", description: err.message }));
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-9"
                      >
                        <Save className="w-4 h-4 ml-1" />
                        حفظ وتعريف الصنف الجديد
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 5: WAREHOUSE SETUP (Image 6) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="warehouses" className="mt-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                <CardTitle className="text-sm font-bold text-slate-700">أنظمة المخازن - إدارة المخازن - بيانات وبطاقة المخازن</CardTitle>
                <CardDescription className="text-xs">تعريف وتوزيع المستودعات ونقاط التخزين المعتمدة للفرع</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Left checkboxes panel */}
                  <div className="md:col-span-1 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-semibold">
                    <h3 className="font-bold text-slate-700 pb-1.5 border-b border-slate-300">محددات المستودع</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeForm.is_suspended === 1} onChange={e => setStoreForm({...storeForm, is_suspended: e.target.checked ? 1 : 0})} className="rounded" />
                      <span>مستودع موقف (معلق العمل به)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeForm.is_main === 1} onChange={e => setStoreForm({...storeForm, is_main: e.target.checked ? 1 : 0})} className="rounded" />
                      <span>يعتبر مستودع رئيسي للشركة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeForm.not_for_sale === 1} onChange={e => setStoreForm({...storeForm, not_for_sale: e.target.checked ? 1 : 0})} className="rounded" />
                      <span>غير قابل للبيع المباشر (تخزين فقط)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeForm.is_damaged === 1} onChange={e => setStoreForm({...storeForm, is_damaged: e.target.checked ? 1 : 0})} className="rounded" />
                      <span>مستودع خاص بالمواد التالفة / المرتجعة</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={storeForm.is_service_default === 1} onChange={e => setStoreForm({...storeForm, is_service_default: e.target.checked ? 1 : 0})} className="rounded" />
                      <span>مستودع الخدمات الافتراضي</span>
                    </label>
                  </div>

                  {/* Main Form Fields */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">رقم المخزن</label>
                        <Input value={storeForm.number} onChange={e => setStoreForm({...storeForm, number: e.target.value})} className="h-8 font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">اسم المخزن بالعربي</label>
                        <Input value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="h-8 font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">الاسم الأجنبي للمخزن</label>
                        <Input value={storeForm.foreign_name} onChange={e => setStoreForm({...storeForm, foreign_name: e.target.value})} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">أمين المخزن المسؤول</label>
                        <Input value={storeForm.storekeeper} onChange={e => setStoreForm({...storeForm, storekeeper: e.target.value})} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">الموقع الجغرافي</label>
                        <Input value={storeForm.location} onChange={e => setStoreForm({...storeForm, location: e.target.value})} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">حساب التحويلات المالي</label>
                        <Input value={storeForm.transfer_account} onChange={e => setStoreForm({...storeForm, transfer_account: e.target.value})} className="h-8" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          if (!storeForm.name) return;
                          apiPost("/api/warehouses", {
                            name: storeForm.name,
                            location: storeForm.location,
                            branch_id: 1
                          }).then(() => {
                            qc.invalidateQueries({ queryKey: ["onyx-warehouses"] });
                            toast({ title: "تم إضافة وتعريف المستودع الحسابي بنجاح" });
                          });
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-9"
                      >
                        <Save className="w-4 h-4 ml-1" />
                        حفظ وتعريف المستودع
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 6: CURRENCY SETUP (Image 7) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="currencies" className="mt-4">
            <Card className="border-slate-300 shadow-sm max-w-3xl mx-auto">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700">بيانات وبطاقة العملات في النظام الحسابي [صورة 7]</CardTitle>
                  <CardDescription className="text-xs font-semibold">تهيئة العملات المحلية والأجنبية وتحديد أسعار صرف التحويل اليومية</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {/* Floating style form matching Image 7 popup */}
                <div className="bg-slate-50 border border-slate-300 rounded p-4 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-700 border-b pb-1">إدخال / تعديل عملة مالية</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">اسم العملة</label>
                      <Input
                        value={currencyForm.name}
                        onChange={e => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                        placeholder="مثال: ريال يمني"
                        className="h-8 text-xs bg-white border-slate-300 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">رمز العملة الدولي</label>
                      <Input
                        value={currencyForm.symbol}
                        onChange={e => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                        placeholder="مثال: YER"
                        className="h-8 text-xs bg-white border-slate-300 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">الفكة / الأجزاء الفرعية</label>
                      <Input
                        value={currencyForm.fraction}
                        onChange={e => setCurrencyForm({ ...currencyForm, fraction: e.target.value })}
                        placeholder="مثال: فلس"
                        className="h-8 text-xs bg-white border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">نوع العملة الحسابية</label>
                      <select
                        value={currencyForm.type}
                        onChange={e => setCurrencyForm({ ...currencyForm, type: e.target.value })}
                        className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                      >
                        <option value="local">عملة محلية معتمدة للفرع</option>
                        <option value="foreign">عملة أجنبية (تحويل)</option>
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="font-semibold text-slate-600">سعر التحويل / سعر الصرف المقابل للعملة المحلية الرئيسي</label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={currencyForm.exchange_rate}
                        onChange={e => setCurrencyForm({ ...currencyForm, exchange_rate: e.target.value })}
                        placeholder="1.0000"
                        className="h-8 text-xs bg-white border-slate-300 font-mono text-blue-700"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingCurrencyId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCurrencyId(null);
                          setCurrencyForm({ name: "", symbol: "", fraction: "فلس", type: "foreign", exchange_rate: "1.0", active: 1 });
                        }}
                        className="h-8 text-xs"
                      >
                        إلغاء التعديل
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        if (editingCurrencyId) {
                          updateCurrencyMutation.mutate({ id: editingCurrencyId, ...currencyForm });
                        } else {
                          addCurrencyMutation.mutate(currencyForm);
                        }
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-8 text-xs gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {editingCurrencyId ? "حفظ التعديلات" : "إضافة العملة المقترحة"}
                    </Button>
                  </div>
                </div>

                {/* Currencies Grid */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white mt-4">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">اسم العملة</th>
                        <th className="p-3">رمز الاختصار</th>
                        <th className="p-3">الفكة</th>
                        <th className="p-3">النوع الحسابي</th>
                        <th className="p-3 text-left">سعر الصرف اليومي</th>
                        <th className="p-3 text-center w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(dbCurrencies as any[]).map((curr: any) => (
                        <tr key={curr.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">{curr.name}</td>
                          <td className="p-3 font-mono font-bold text-blue-700">{curr.symbol}</td>
                          <td className="p-3">{curr.fraction ?? "—"}</td>
                          <td className="p-3">
                            <Badge className={curr.type === 'local' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-slate-100 text-slate-800 hover:bg-slate-100'}>
                              {curr.type === 'local' ? 'عملة محلية' : 'عملة أجنبية'}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-left font-bold text-slate-700">{curr.exchange_rate}</td>
                          <td className="p-3 text-center flex justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setEditingCurrencyId(curr.id);
                                setCurrencyForm({
                                  name: curr.name,
                                  symbol: curr.symbol,
                                  fraction: curr.fraction ?? "فلس",
                                  type: curr.type,
                                  exchange_rate: String(curr.exchange_rate),
                                  active: curr.active
                                });
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("حذف العملة؟")) {
                                  deleteCurrencyMutation.mutate(curr.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────── */}
          {/* TAB 7: ITEMS PRICING LIST (Image 8) */}
          {/* ──────────────────────────────────────────────────────── */}
          <TabsContent value="pricing" className="mt-4">
            <Card className="border-slate-300 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-700">أنظمة المخازن - نظام إدارة المخازن - تسعيرة الأصناف والخدمات [صورة 8]</CardTitle>
                  <CardDescription className="text-xs">استعراض وتعديل تسعيرة بيع المنتجات بالاعتماد على التكلفة والربح المستهدف</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    updatePricesMutation.mutate(pricingGrid);
                  }}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs h-8 gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  حفظ وتطبيق الأسعار الجديدة
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                {/* Filtration bar matching Image 8 top options */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">تعبئة البيانات من مجموعة الأصناف</label>
                    <select
                      value={pricingParams.category_id}
                      onChange={e => setPricingParams({ ...pricingParams, category_id: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="">جميع مجموعات الأصناف</option>
                      {dbCategories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">طريقة إدخال البيانات</label>
                    <Input value="تعديل يدوي للأسعار في الجدول" className="h-8 bg-slate-100" disabled />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">الترتيب والفرز حسب</label>
                    <Input value="ترتيب تصاعدي برقم الصنف" className="h-8 bg-slate-100" disabled />
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-600 pt-5">
                    <input
                      type="checkbox"
                      checked={pricingParams.filter_unpriced}
                      onChange={e => setPricingParams({ ...pricingParams, filter_unpriced: e.target.checked })}
                      className="rounded"
                    />
                    <span>عرض الأصناف النشطة فقط</span>
                  </div>
                </div>

                {/* Items pricing table grid */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5">رقم الصنف</th>
                        <th className="p-2.5">اسم الصنف المعياري</th>
                        <th className="p-2.5">الوحدة</th>
                        <th className="p-2.5">العملة الحسابية</th>
                        <th className="p-2.5 text-center w-24">نسبة الربح المستهدفة</th>
                        <th className="p-2.5 text-left w-32">السعر الحالي للبيع</th>
                        <th className="p-2.5 text-left w-36">السعر الجديد المقترح</th>
                        <th className="p-2.5 text-left w-28">متوسط التكلفة للربح</th>
                        <th className="p-2.5 text-left w-28">آخر سعر توريد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {pricingGrid.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500 font-semibold">{p.number}</td>
                          <td className="p-2.5 font-sans font-bold text-slate-800">{p.name}</td>
                          <td className="p-2.5 font-sans text-slate-500">{p.unit}</td>
                          <td className="p-2.5 font-sans text-slate-600">{p.currency}</td>
                          <td className="p-2.5 text-center font-sans text-emerald-700 font-bold">{p.profit_margin}%</td>
                          <td className="p-2.5 text-left text-slate-500">{p.old_price.toLocaleString()}</td>
                          <td className="p-2.5 text-left">
                            <Input
                              type="number"
                              value={p.new_price}
                              onChange={e => {
                                const val = Number(e.target.value || 0);
                                const newGrid = [...pricingGrid];
                                newGrid[idx].new_price = val;
                                // Recalculate profit margin based on cost
                                const costVal = p.avg_cost || 1;
                                newGrid[idx].profit_margin = Math.round(((val - costVal) / costVal) * 100);
                                setPricingGrid(newGrid);
                              }}
                              className="h-7 text-xs font-bold text-blue-700 text-left w-32 ml-auto"
                            />
                          </td>
                          <td className="p-2.5 text-left text-slate-500">{Math.round(p.avg_cost).toLocaleString()}</td>
                          <td className="p-2.5 text-left text-slate-400">{Math.round(p.last_supply).toLocaleString()}</td>
                        </tr>
                      ))}
                      {pricingGrid.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 font-sans">
                            لا توجد أصناف تطابق فلاتر البحث الحالية
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
