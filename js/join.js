import { createStore, isDemo } from "./store.js";

const $ = (id) => document.getElementById(id);
$("demoBanner").hidden = !isDemo;

const store = await createStore();
const val = (id) => $(id).value.trim();

$("joinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("formError").textContent = "";
  const req = {
    name: val("name"),
    phone: val("phone"),
    pledge: val("pledge"),
    method: val("method"),
  };
  if (req.name.length < 2) return fail("Please enter your name.", "name");
  if (req.phone.replace(/\D/g, "").length < 7) return fail("Please enter your WhatsApp number.", "phone");
  if (!req.pledge) return fail("Please enter your pledge amount.", "pledge");
  if (!req.method) return fail("Please choose how you paid.", "method");
  if (val("reference")) req.reference = val("reference");
  if (val("note")) req.note = val("note");

  $("submitBtn").disabled = true;
  try {
    await store.submitRequest(req);
    $("joinForm").reset();
    $("formPanel").hidden = true;
    $("thanksPanel").hidden = false;
    scrollTo({ top: 0 });
  } catch {
    fail("Sorry, that didn't send. Check your connection and try again.");
  }
  $("submitBtn").disabled = false;
});

$("againBtn").addEventListener("click", () => {
  $("thanksPanel").hidden = true;
  $("formPanel").hidden = false;
  $("name").focus();
});

function fail(msg, field) {
  $("formError").textContent = msg;
  if (field) $(field).focus();
}
