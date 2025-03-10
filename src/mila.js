/**

  MILA

  Script principal de inicialización del entorno

  VARIABLES
    div                   La div de la interfaz blockly en el documento
    idioma                El código de idioma del idioma actual
    juego                 El código del juego actual
    workspace             La interfaz de Blockly insertada en la página
    generador             El generador de código de Blockly

    argumentosValidos     Posibles valores para los argumentos que vienen en la URL

  FUNCIONES
    precarga                  Inicializa todo lo necesario antes de que se termine de cargar la página
      agregarFuentesBlockly   Importa todos los archivos necesarios de Blockly
      cargarIdioma            Determina el idioma actual y lo guarda en Mila.idioma
      cargarJuego             Determina el juago actual y lo guarda en Mila.juego
    inicializar               Inicializa todo lo necesario una vez que se termina de cargar la página
      registrarEventos        Registra handlers para todos los eventos
    redimensionar             Esta función se ejecuta cada vez que cambia el tamaño de la ventana del navegador

    ejecutar                  Inicia la ejecución
    detener                   Detiene la ejecución
    debug                     Inicia el debugger (o avanza un paso si ya está iniciado)

    argumentoURL              Obtiene argumentos de la url (?key=valor)
    agregarScriptFuente       Agrega un script al documento
    agregarImagenFuente       Agrega una imagen al documento y le asigna un id

**/

const Mila = {};
const INTERVALO_INICIAL = 25;

// Posibles valores para los argumentos que vienen en la URL
  // El primero es el valor por defecto
Mila.argumentosValidos = {
  idioma:['es','en'],
  juego:['demo','figus','figus2','figus0','10k','10k2','incendio'],
  toolbox:['on','off'],
  funciones:['-','func','proc','all','none']
}

// Inicializa todo lo necesario antes de que se termine de cargar la página
Mila.preCarga = function() {
  // Esto se debe hacer antes de cargar la página ya que hay que incrustar los archivos en el documento
  Mila.agregarFuentesBlockly(); // según si se usa la versión comprimida o sin comprimir
  Mila.cargarIdioma();          // en base al argumento 'idioma' en la url
  Mila.cargarJuego();           // en base al argumento 'juego' en la url
}

// Importa todos los archivos necesarios de Blockly
Mila.agregarFuentesBlockly = function() {
  if (version_comprimida) {
    Mila.agregarScriptFuente('blockly/blockly_compressed.js');        // Blockly comprimido
    Mila.agregarScriptFuente('blockly/blocks_compressed.js');         // Bloques comprimidos
    Mila.agregarScriptFuente('blockly/javascript_compressed.js');     // Generador comprimido
  } else {
    Mila.agregarScriptFuente('blockly/blockly_uncompressed.js');      // Blockly sin comprimir
    Mila.agregarScriptFuente('blockly/generators/javascript.js');     // Generador base
    const archivosBloques = ["logic","loops","math","text","lists","colour","variables","procedures"];
    for (archivo of archivosBloques) {
      Mila.agregarScriptFuente(`blockly/blocks/${archivo}.js`);                // Bloques sin comprimir
      Mila.agregarScriptFuente(`blockly/generators/javascript/${archivo}.js`); // y sus funciones generadoras
    }
  }
  Mila.agregarScriptFuente(`src/blockly/bloques.js`);       // Bloques propios
  Mila.agregarScriptFuente(`src/blockly/generadores.js`);   // y sus funciones generadoras
};

// Determina el idioma actual y lo guarda en Mila.idioma
Mila.cargarIdioma = function() {
  Mila.idioma = Mila.argumentoURL('idioma');
  Mila.agregarScriptFuente(`blockly/msg/js/${Mila.idioma}.js`); // Carga archivo de idioma de Blockly
  Mila.agregarScriptFuente(`src/blockly/${Mila.idioma}.js`);    // Carga archivo de idioma propio
};

// Determina el juago actual y lo guarda en Mila.juego
Mila.cargarJuego = function() {
  Mila.juego = Mila.argumentoURL('juego');
  Mila.agregarScriptFuente(`src/juegos/${Mila.juego}.js`);          // Carga script de inicialización del juego actual
  Mila.agregarScriptFuente(`src/juegos/${Mila.juego}/toolbox.js`);  // Carga el toolbox del juego actual
};

// Inicializa todo lo necesario una vez que se termina de cargar la página
Mila.inicializar = function() {
  Mila.div = document.getElementById('blockly');
  Layout.inicializar();          // Inicializar la interfaz
  Canvas.inicializar();          // Inicializar el canvas
  Mila.Blockly.inicializar();    // Inyectar la interfaz de Blockly
  Juego.inicializar();           // Inicializar el juego
  Mila.registrarEventos();       // Registrar handlers para eventos
  Interprete.inicializar();      // Inicializar el intérprete
  Mila.redimensionar();          // Llamo a esta función para que ajuste el tamaño al iniciar
  CLOCK.crear(INTERVALO_INICIAL);// Creo el clock
  SLIDER.nuevo({
    placeholderId: 'sliderPlaceholder',
    valorInicial: CLOCK.ESCALA,
    maximoInicial: 2 * CLOCK.ESCALA,
    maximoMaximo: INTERVALO_INICIAL * CLOCK.ESCALA,
    mostrarValor: false,
    paso: CLOCK.ESCALA,
    funcion: function(valor) {
      CLOCK.setearVelocidad(Math.floor(valor));
    }
  });
  document.getElementById('slider_input_0').style.margin = '-6px 0px';
  if ('pedirPerfil' in Juego && Juego.pedirPerfil) { Mila.pedirPerfil(); }
};

// Registra handlers para todos los eventos
Mila.registrarEventos = function () {
  window.addEventListener('resize', Mila.redimensionar, false);   // Al cambiar el tamaño de la pantalla
};

// Esta función se ejecuta cada vez que cambia el tamaño de la ventana del navegador
//  (y una vez cuando se inicializa la página)
Mila.redimensionar = function() {
  Mila.div.style.height = `${Layout.altoBlockly()}px`;
  Mila.div.style.width = `${Layout.anchoBlockly()}px`;
  Blockly.svgResize(Mila.workspace);
  Canvas.redimensionar();
  Layout.redimensionar();
};

// Inicia la ejecución
Mila.ejecutar = function(){
  document.getElementById("botonEjecutar").classList.remove("glow");
  if (/* reiniciar al ejecutar */true) {
    Mila.detener();
  } else {
    CLOCK.detener();
    Interprete.detener();
    Mila.reiniciarRobots();
  }
  const codigo = (Mila.generador.header || '') + Mila.generador.workspaceToCode(Mila.workspace);
  console.log(codigo);
  Interprete.compilar(codigo);
  Interprete.ejecutar();
  CLOCK.iniciar(function(){
    Mila.paso();
  });
}

// Detiene la ejecución
Mila.detener = function() {
  CLOCK.detener();
  Interprete.detener();
  Canvas.reiniciar();   // Elimino todos los objetos del canvas
  Juego.reiniciar();    // Reinicio el juego
  Canvas.actualizar();  // Al reiniciar el juego se cargaron nuevos objetos al canvas
};

// Inicia el debugger (o avanza un paso si ya está iniciado)
Mila.debug = function(){
  if (Interprete.estado == DEBUGGEANDO) {
    Mila.paso();
  } else {
    Mila.detener();
    const codigo = (Mila.generador.header || '') + Mila.generador.workspaceToCode(Mila.workspace);
    Interprete.compilar(codigo);
    Interprete.debug();
  }
};

Mila.paso = function() {
  Interprete.paso();
  Juego.paso();
  Canvas.actualizar();
};

Mila.reiniciarRobots = function() {
  for (let robot of Juego.robots) {
    robot.estado = 0;
  }
};

// Obtiene argumentos de la url (?key=valor)
// Si no se encuentra o si no es uno de los válidos, devuelve el valor por defecto
Mila.argumentoURL = function(key) {
  let valor = location.search.match(new RegExp('[?&]' + key + '=([^&]+)'));
  const validos = Mila.argumentosValidos[key];
  const defecto = (validos == null ? null : validos[0]);
  if (valor) {
    valor = decodeURIComponent(valor[1].replace(/\+/g, '%20'));
    if (validos != null && !validos.includes(valor)) {
      valor = defecto;
    }
  } else {
    valor = defecto;
  }
  return valor
};

// Agrega un script al documento
Mila.agregarScriptFuente = function(ruta) {
  document.write(`<script src="${ruta}"></script>\n`);
};

// Agrega una imagen al documento y le asigna un id
Mila.agregarImagenFuente = function(ruta, idArg) {
  let id = ruta.split(".")[0];
  if (idArg) {
    id = idArg;
  }
  document.write(`<img src="src/img/${ruta}" id="${id}" hidden></img>\n`);
};

Mila.agregarImagenFuenteLocal = function(ruta, idArg) {
  let id = ruta.split(".")[0];
  if (idArg) {
    id = idArg;
  }
  document.write(`<img src="src/juegos/${ruta}" id="${id}" hidden></img>\n`);
};

// Define los roles del juego seleccionado.
Mila.roles = function() {
  return Juego.roles();
}

Mila.cambiarPerfil = function() {
  let s = document.getElementById("nombreJugador");
  if (s.style.display == 'none') {
    Mila.pedirPerfil();
  } else {
    let b = document.getElementById("botonPerfil");
    Juego.jugador(null);
    s.style.display = 'none';
    b.innerHTML = "Perfil";
  }
};

Mila.pedirPerfil = function() {
  let miNombre = prompt("¿Cómo te llamás?");
  if (miNombre) {
    let s = document.getElementById("nombreJugador");
    let b = document.getElementById("botonPerfil");
    s.innerHTML = miNombre;
    s.style.display = 'unset';
    b.innerHTML = "X";
    Juego.jugador(miNombre);
  }
};

Mila.info = function() {
  const modal = document.getElementById('modal');
  if (modal.style.display == 'block') {
    modal.style.display = 'none';
  } else {
    modal.innerHTML = "Desarrollado por <a href='https://gpfernandezflorio.github.io/' target='_blank'>Gonzalo Pablo Fernández</a> <a class='btn-flat waves-effect waves-light z-depth-1-half' onclick='Mila.info();'>X</a>";
    modal.style.display = 'block';
  }
};

// Antes de terminar de cargar la página, llamo a esta función
Mila.preCarga();


// Cuando se termina de cargar la página, llamo a inicializar
window.addEventListener('load', Mila.inicializar);
