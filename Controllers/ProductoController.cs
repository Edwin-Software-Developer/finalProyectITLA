using Microsoft.AspNetCore.Mvc;

namespace ControlStock.Controllers
{
    public class ProductoController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
