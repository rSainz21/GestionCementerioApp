<?php

namespace Database\Seeders;

use App\Models\CemnBloque;
use App\Models\CemnCementerio;
use App\Models\CemnConcesion;
use App\Models\CemnConcesionPersona;
use App\Models\CemnMovimiento;
use App\Models\CemnPersona;
use App\Models\CemnSepultura;
use App\Models\CemnZona;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    // -------------------------------------------------------------------------
    // Datos de relleno realistas
    // -------------------------------------------------------------------------

    private array $nombresH = [
        'Antonio','Manuel','José','Francisco','David','Juan','Pedro','Carlos',
        'Jesús','Ángel','Miguel','Luis','Javier','Fernando','Ramón','Alberto',
        'Agustín','Santiago','Emilio','Gregorio','Tomás','Hilario','Valentín',
        'Crescencio','Isidoro','Roque','Urbano','Leandro','Celestino','Victoriano',
    ];

    private array $nombresM = [
        'María','Carmen','Ana','Isabel','Pilar','Rosa','Teresa','Josefa',
        'Francisca','Dolores','Concepción','Lucía','Gloria','Amparo','Esperanza',
        'Manuela','Consuelo','Remedios','Encarnación','Virtudes','Felisa',
        'Epifania','Asunción','Visitación','Natividad','Purificación','Nieves',
    ];

    private array $apellidos = [
        'García','González','Rodríguez','Fernández','López','Martínez','Sánchez',
        'Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno',
        'Álvarez','Muñoz','Romero','Alonso','Gutiérrez','Navarro','Torres',
        'Domínguez','Vázquez','Ramos','Gil','Serrano','Blanco','Molina','Morales',
        'Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz',
        'Iglesias','Núñez','Medina','Guerrero','Castillo','Santos','Herrera',
        'Peña','Flores','Lozano','Cabrera','Prieto',
    ];

    private array $calles = [
        'Calle Mayor','Calle Real','Calle Nueva','Calle del Sol','Avenida de Cantabria',
        'Calle de la Iglesia','Barrio de Somahoz','Camino de las Eras','Calle del Río',
        'Calle de San Juan','Travesía del Monte','Barrio de Corrales','Calle Picos',
        'Calle Ramón y Cajal','Avenida de los Prados','Calle de la Fuente',
    ];

    private array $municipios = [
        'Los Corrales de Buelna','Torrelavega','Santander','Reocín','Cartes',
        'Cieza','Somahoz','Bárcena de Pie de Concha','Molledo','Arenas de Iguña',
    ];

    private array $parentescos = [
        'cónyuge','hijo/a','padre/madre','hermano/a','abuelo/a','nieto/a','sobrino/a','familiar',
    ];

    private int $expCounter = 1;

    // -------------------------------------------------------------------------

    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // Borrar en orden correcto
        DB::table('cemn_movimientos')->truncate();
        DB::table('cemn_documentos')->truncate();
        DB::table('cemn_concesion_personas')->truncate();
        DB::table('cemn_personas')->truncate();
        DB::table('cemn_concesiones')->truncate();
        DB::table('cemn_sepulturas')->truncate();
        DB::table('cemn_bloques')->truncate();
        DB::table('cemn_zonas')->truncate();
        DB::table('cemn_cementerios')->truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // ------------------------------------------------------------------ //
        //  CEMENTERIO                                                          //
        // ------------------------------------------------------------------ //
        $cem = CemnCementerio::create([
            'nombre'    => 'Cementerio Municipal de Somahoz',
            'municipio' => 'Los Corrales de Buelna',
            'direccion' => 'Barrio de Somahoz, s/n — Los Corrales de Buelna (Cantabria)',
            'notas'     => 'Cementerio municipal gestionado por el Ayuntamiento de Los Corrales de Buelna.',
        ]);

        // ------------------------------------------------------------------ //
        //  ZONAS                                                               //
        // ------------------------------------------------------------------ //
        $zonaVieja = CemnZona::create([
            'cementerio_id' => $cem->id,
            'nombre'        => 'Zona Histórica',
            'codigo'        => 'ZH',
            'descripcion'   => 'Sepulturas en tierra y panteones históricos (anterior a 1980).',
            'lat'           => 43.2478,
            'lon'           => -4.0621,
        ]);

        $zonaNicho = CemnZona::create([
            'cementerio_id' => $cem->id,
            'nombre'        => 'Zona de Nichos',
            'codigo'        => 'ZN',
            'descripcion'   => 'Bloques de nichos y columbarios modernos.',
            'lat'           => 43.2481,
            'lon'           => -4.0618,
        ]);

        $zonaJardin = CemnZona::create([
            'cementerio_id' => $cem->id,
            'nombre'        => 'Jardín de Cenizas',
            'codigo'        => 'JC',
            'descripcion'   => 'Zona de columbarios y urnas cinerarias.',
            'lat'           => 43.2475,
            'lon'           => -4.0615,
        ]);

        // ------------------------------------------------------------------ //
        //  BLOQUES                                                             //
        // ------------------------------------------------------------------ //

        $bloqueA = CemnBloque::create([
            'zona_id'     => $zonaNicho->id,
            'nombre'      => 'Bloque A — Nichos Norte',
            'codigo'      => 'NA',
            'tipo'        => 'nichos',
            'filas'       => 6,
            'columnas'    => 14,
            'descripcion' => 'Primer bloque de nichos, orientación norte.',
        ]);

        $bloqueB = CemnBloque::create([
            'zona_id'     => $zonaNicho->id,
            'nombre'      => 'Bloque B — Nichos Sur',
            'codigo'      => 'NB',
            'tipo'        => 'nichos',
            'filas'       => 6,
            'columnas'    => 14,
            'descripcion' => 'Segundo bloque de nichos, orientación sur.',
        ]);

        $bloqueC = CemnBloque::create([
            'zona_id'     => $zonaNicho->id,
            'nombre'      => 'Bloque C — Nichos Ampliación',
            'codigo'      => 'NC',
            'tipo'        => 'nichos',
            'filas'       => 4,
            'columnas'    => 10,
            'descripcion' => 'Bloque de ampliación (año 2005).',
        ]);

        $bloqueCol = CemnBloque::create([
            'zona_id'     => $zonaJardin->id,
            'nombre'      => 'Columbarios I',
            'codigo'      => 'COL1',
            'tipo'        => 'columbarios',
            'filas'       => 5,
            'columnas'    => 10,
            'descripcion' => 'Columbarios para urnas cinerarias.',
        ]);

        $bloqueCol2 = CemnBloque::create([
            'zona_id'     => $zonaJardin->id,
            'nombre'      => 'Columbarios II',
            'codigo'      => 'COL2',
            'tipo'        => 'columbarios',
            'filas'       => 4,
            'columnas'    => 8,
            'descripcion' => 'Segunda sección de columbarios.',
        ]);

        // ------------------------------------------------------------------ //
        //  SEPULTURAS — Zona Histórica (sin bloque)                           //
        // ------------------------------------------------------------------ //
        $partesVieja = ['NORTE', 'SUR', 'ESTE', 'OESTE'];
        $sepulturasViejas = [];
        for ($i = 1; $i <= 30; $i++) {
            $parte = $partesVieja[($i - 1) % 4];
            $sep = CemnSepultura::create([
                'zona_id'         => $zonaVieja->id,
                'bloque_id'       => null,
                'tipo'            => 'sepultura',
                'numero'          => $i,
                'parte'           => $parte,
                'codigo'          => "ZH-{$parte}-{$i}",
                'estado'          => CemnSepultura::ESTADO_LIBRE,
                'ubicacion_texto' => "Zona Histórica · {$parte} · Nº {$i}",
            ]);
            $sepulturasViejas[] = $sep;
        }

        // ------------------------------------------------------------------ //
        //  SEPULTURAS — Bloques (grid)                                         //
        // ------------------------------------------------------------------ //
        $bloquesGrid = [$bloqueA, $bloqueB, $bloqueC, $bloqueCol, $bloqueCol2];
        foreach ($bloquesGrid as $bloque) {
            $tipo = str_starts_with($bloque->tipo, 'col') ? 'columbario' : 'nicho';
            for ($f = 1; $f <= $bloque->filas; $f++) {
                for ($c = 1; $c <= $bloque->columnas; $c++) {
                    CemnSepultura::create([
                        'zona_id'   => $bloque->zona_id,
                        'bloque_id' => $bloque->id,
                        'tipo'      => $tipo,
                        'fila'      => $f,
                        'columna'   => $c,
                        'codigo'    => CemnSepultura::generarCodigo($bloque, $f, $c),
                        'estado'    => CemnSepultura::ESTADO_LIBRE,
                    ]);
                }
            }
        }

        // ------------------------------------------------------------------ //
        //  POBLAR: mezcla de estados y datos                                   //
        // ------------------------------------------------------------------ //

        $nichosA = CemnSepultura::where('bloque_id', $bloqueA->id)->get()->shuffle();
        $this->clausurar($nichosA->slice(0, 3));
        $this->reservar($nichosA->slice(3, 5));
        foreach ($nichosA->slice(8, 45) as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(1960, 2022));
        }

        $nichosB = CemnSepultura::where('bloque_id', $bloqueB->id)->get()->shuffle();
        $this->clausurar($nichosB->slice(0, 2));
        $this->reservar($nichosB->slice(2, 6));
        foreach ($nichosB->slice(6, 44) as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(1975, 2023));
        }

        $nichosC = CemnSepultura::where('bloque_id', $bloqueC->id)->get()->shuffle();
        $this->reservar($nichosC->slice(0, 3));
        foreach ($nichosC->slice(3, 21) as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(2005, 2025));
        }

        $col1 = CemnSepultura::where('bloque_id', $bloqueCol->id)->get()->shuffle();
        $this->reservar($col1->slice(0, 4));
        foreach ($col1->slice(4, 32) as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(2000, 2025), columbario: true);
        }

        $col2 = CemnSepultura::where('bloque_id', $bloqueCol2->id)->get()->shuffle();
        foreach ($col2->slice(0, 12) as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(2010, 2025), columbario: true);
        }

        $viejasOcupar = collect($sepulturasViejas)->shuffle()->slice(0, 20);
        foreach ($viejasOcupar as $sep) {
            $this->crearCaso($sep, $this->fechaAleatoria(1930, 1990), perpetua: true);
        }

        // Nichos con dos difuntos (familia)
        $conDosOcupantes = CemnSepultura::whereIn('bloque_id', [$bloqueA->id, $bloqueB->id])
            ->where('estado', CemnSepultura::ESTADO_OCUPADA)
            ->inRandomOrder()
            ->limit(10)
            ->get();

        foreach ($conDosOcupantes as $sep) {
            $concesion = CemnConcesion::where('sepultura_id', $sep->id)->first();
            if (!$concesion) continue;
            $this->crearDifunto($sep->id, $concesion->id, esPrincipal: false,
                fechaBase: $this->fechaAleatoria(1960, 2020));
        }

        // Concesiones caducadas
        $caducadas = CemnSepultura::where('bloque_id', $bloqueB->id)
            ->where('estado', CemnSepultura::ESTADO_OCUPADA)
            ->inRandomOrder()
            ->limit(5)
            ->get();

        foreach ($caducadas as $sep) {
            $concesion = CemnConcesion::where('sepultura_id', $sep->id)->first();
            if ($concesion) {
                $concesion->estado = 'caducada';
                $concesion->fecha_vencimiento = now()->subYears(rand(1, 5))->toDateString();
                $concesion->save();
            }
        }

        // Movimientos: inhumaciones y traslados
        $difuntosConMovimiento = CemnPersona::whereIn('tipo', ['difunto', 'ambos'])
            ->inRandomOrder()->limit(15)->get();

        foreach ($difuntosConMovimiento as $difunto) {
            if (!$difunto->sepultura_id) continue;

            CemnMovimiento::create([
                'persona_id'          => $difunto->id,
                'tipo'                => 'inhumacion',
                'fecha'               => $difunto->fecha_inhumacion,
                'sepultura_origen_id' => null,
                'sepultura_destino_id'=> $difunto->sepultura_id,
                'numero_expediente'   => $this->numExp(),
                'notas'               => 'Inhumación inicial registrada.',
            ]);
        }

        $trasladados = CemnPersona::whereIn('tipo', ['difunto', 'ambos'])
            ->whereNotNull('sepultura_id')
            ->inRandomOrder()->limit(5)->get();

        $sepLibres = CemnSepultura::where('estado', CemnSepultura::ESTADO_LIBRE)
            ->where('bloque_id', '!=', null)
            ->inRandomOrder()->limit(5)->get();

        foreach ($trasladados as $idx => $difunto) {
            $destino = $sepLibres[$idx] ?? null;
            if (!$destino) continue;

            $origen = $difunto->sepultura_id;

            CemnMovimiento::create([
                'persona_id'           => $difunto->id,
                'tipo'                 => 'traslado',
                'fecha'                => now()->subMonths(rand(1, 24))->toDateString(),
                'sepultura_origen_id'  => $origen,
                'sepultura_destino_id' => $destino->id,
                'numero_expediente'    => $this->numExp(),
                'notas'                => 'Traslado por renovación de concesión.',
            ]);

            $difunto->sepultura_id = $destino->id;
            $difunto->save();

            $destino->estado = CemnSepultura::ESTADO_OCUPADA;
            $destino->save();

            $origenSep = CemnSepultura::find($origen);
            $quedanInhumados = CemnPersona::whereIn('tipo', ['difunto', 'ambos'])
                ->where('sepultura_id', $origen)
                ->where('es_principal', true)
                ->where('estado_inhumacion', 'inhumado')
                ->count();
            if ($origenSep && $quedanInhumados === 0) {
                $origenSep->estado = CemnSepultura::ESTADO_LIBRE;
                $origenSep->save();
            }
        }

        $this->command->info('✅ DemoDataSeeder completado.');
        $this->imprimirResumen();
    }

    // -------------------------------------------------------------------------
    //  Helpers
    // -------------------------------------------------------------------------

    private function crearCaso(
        CemnSepultura $sep,
        string $fechaBase,
        bool $perpetua = false,
        bool $columbario = false
    ): void {
        $titular = $this->crearTitular();

        $tipo = $perpetua ? 'perpetua' : 'temporal';
        $duracion = $perpetua ? null : (rand(0, 3) < 1 ? 5 : 10);
        $fechaConcesion = $this->desplazarFecha($fechaBase, 0, 30);
        $fechaVencimiento = ($duracion && !$perpetua)
            ? date('Y-m-d', strtotime("+{$duracion} years", strtotime($fechaConcesion)))
            : null;

        $estadoConcesion = 'vigente';
        if ($fechaVencimiento && $fechaVencimiento < date('Y-m-d')) {
            $estadoConcesion = rand(0, 3) < 1 ? 'caducada' : 'vigente';
        }

        $moneda = (intval(substr($fechaBase, 0, 4)) < 2002) ? 'pesetas' : 'euros';
        $importe = $moneda === 'pesetas' ? rand(5000, 50000) : rand(150, 900);

        $concesion = CemnConcesion::create([
            'sepultura_id'      => $sep->id,
            'numero_expediente' => $this->numExp(),
            'tipo'              => $tipo,
            'fecha_concesion'   => $fechaConcesion,
            'fecha_vencimiento' => $fechaVencimiento,
            'duracion_anos'     => $duracion,
            'estado'            => $estadoConcesion,
            'importe'           => $importe,
            'moneda'            => $moneda,
            'texto_concesion'   => $this->textoConcesonAleatorio($tipo, $fechaBase),
        ]);

        CemnConcesionPersona::create([
            'concesion_id' => $concesion->id,
            'persona_id'   => $titular->id,
            'rol'          => 'concesionario',
            'fecha_desde'  => $fechaConcesion,
            'activo'       => true,
        ]);

        if (rand(0, 4) === 0) {
            $heredero = $this->crearTitular();
            CemnConcesionPersona::create([
                'concesion_id' => $concesion->id,
                'persona_id'   => $heredero->id,
                'rol'          => 'heredero',
                'fecha_desde'  => $this->desplazarFecha($fechaConcesion, 365, 3650),
                'activo'       => true,
            ]);
        }

        $this->crearDifunto($sep->id, $concesion->id, esPrincipal: true, fechaBase: $fechaBase, columbario: $columbario);

        $sep->estado = CemnSepultura::ESTADO_OCUPADA;
        $sep->save();
    }

    private function crearDifunto(
        int $sepulturaId,
        int $concesionId,
        bool $esPrincipal,
        string $fechaBase,
        bool $columbario = false
    ): void {
        $esHombre = rand(0, 1);
        $nombre = $esHombre
            ? $this->nombresH[array_rand($this->nombresH)]
            : $this->nombresM[array_rand($this->nombresM)];

        $ap1 = $this->apellidos[array_rand($this->apellidos)];
        $ap2 = $this->apellidos[array_rand($this->apellidos)];

        $fechaFallecimiento = $this->desplazarFecha($fechaBase, -30, 30);
        $fechaInhumacion    = $this->desplazarFecha($fechaFallecimiento, 1, 5);
        $edad = rand(45, 98);

        CemnPersona::create([
            'tipo'                => 'difunto',
            'nombre_completo'     => "{$nombre} {$ap1} {$ap2}",
            'fecha_fallecimiento' => $fechaFallecimiento,
            'fecha_inhumacion'    => $fechaInhumacion,
            'sepultura_id'        => $sepulturaId,
            'concesion_id'        => $concesionId,
            'es_principal'        => $esPrincipal,
            'estado_inhumacion'   => 'inhumado',
            'parentesco'          => $esPrincipal ? null : $this->parentescos[array_rand($this->parentescos)],
            'notas'               => $columbario
                ? 'Restos depositados en urna cineraria. Edad: '.$edad.' años.'
                : 'Edad al fallecimiento: '.$edad.' años.',
        ]);
    }

    private function crearTitular(): CemnPersona
    {
        $esHombre = rand(0, 1);
        $nombre   = $esHombre
            ? $this->nombresH[array_rand($this->nombresH)]
            : $this->nombresM[array_rand($this->nombresM)];
        $ap1 = $this->apellidos[array_rand($this->apellidos)];
        $ap2 = $this->apellidos[array_rand($this->apellidos)];

        $dni = strtoupper(substr(md5(microtime(true).rand()), 0, 8)).chr(rand(65, 90));
        $num = rand(1, 99);

        return CemnPersona::create([
            'tipo'            => 'titular',
            'nombre'          => $nombre,
            'apellido1'       => $ap1,
            'apellido2'       => $ap2,
            'nombre_original' => "{$nombre} {$ap1} {$ap2}",
            'dni'             => $dni,
            'es_empresa'      => false,
            'telefono'        => '6'.rand(10, 99).rand(1000000, 9999999),
            'email'           => strtolower($this->ascii(mb_substr($nombre, 0, 1)).$this->ascii($ap1)).rand(1,999).'@correo.es',
            'direccion'       => $this->calles[array_rand($this->calles)].', '.$num,
            'municipio'       => $this->municipios[array_rand($this->municipios)],
            'provincia'       => 'Cantabria',
            'cp'              => '394'.str_pad((string) rand(0, 99), 2, '0'),
        ]);
    }

    private function reservar($sepulturas): void
    {
        foreach ($sepulturas as $sep) {
            $sep->estado = CemnSepultura::ESTADO_RESERVADA;
            $sep->save();
        }
    }

    private function clausurar($sepulturas): void
    {
        foreach ($sepulturas as $sep) {
            $sep->estado = CemnSepultura::ESTADO_CLAUSURADA;
            $sep->notas  = 'Unidad clausurada por deterioro estructural.';
            $sep->save();
        }
    }

    private function numExp(): string
    {
        return 'EXP-'.date('Y').'-'.str_pad((string) $this->expCounter++, 4, '0', STR_PAD_LEFT);
    }

    private function fechaAleatoria(int $anioMin, int $anioMax): string
    {
        $ts = rand(mktime(0, 0, 0, 1, 1, $anioMin), mktime(0, 0, 0, 12, 31, $anioMax));
        return date('Y-m-d', $ts);
    }

    private function desplazarFecha(string $fecha, int $minDias, int $maxDias): string
    {
        $dias = rand($minDias, $maxDias);
        return date('Y-m-d', strtotime("{$fecha} +{$dias} days"));
    }

    private function textoConcesonAleatorio(string $tipo, string $fechaBase): string
    {
        $anio = intval(substr($fechaBase, 0, 4));
        if ($tipo === 'perpetua') {
            return 'Concesión a perpetuidad otorgada por el Ayuntamiento de Los Corrales de Buelna conforme al Reglamento Municipal de Cementerios vigente.';
        }
        if ($anio < 1990) {
            return 'Concesión temporal por plazo de diez años, renovable, según acuerdo de la Comisión Municipal Permanente.';
        }
        return 'Concesión temporal conforme al Reglamento de Policía Sanitaria Mortuoria y ordenanzas municipales. Renovable a vencimiento.';
    }

    private function ascii(string $s): string
    {
        $map = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n',
                'Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','Ü'=>'u','Ñ'=>'n'];
        return strtr($s, $map);
    }

    private function imprimirResumen(): void
    {
        $this->command->table(
            ['Tabla', 'Registros'],
            [
                ['cemn_cementerios',          CemnCementerio::count()],
                ['cemn_zonas',                CemnZona::count()],
                ['cemn_bloques',              CemnBloque::count()],
                ['cemn_sepulturas',           CemnSepultura::count()],
                ['  · libres',                CemnSepultura::where('estado', 'libre')->count()],
                ['  · ocupadas',              CemnSepultura::where('estado', 'ocupada')->count()],
                ['  · reservadas',            CemnSepultura::where('estado', 'reservada')->count()],
                ['  · clausuradas',           CemnSepultura::where('estado', 'clausurada')->count()],
                ['cemn_personas (titular)',    CemnPersona::where('tipo', 'titular')->count()],
                ['cemn_personas (difunto)',    CemnPersona::whereIn('tipo', ['difunto', 'ambos'])->count()],
                ['cemn_concesiones',          CemnConcesion::count()],
                ['  · vigentes',              CemnConcesion::where('estado', 'vigente')->count()],
                ['  · caducadas',             CemnConcesion::where('estado', 'caducada')->count()],
                ['cemn_concesion_personas',   \Illuminate\Support\Facades\DB::table('cemn_concesion_personas')->count()],
                ['cemn_movimientos',          CemnMovimiento::count()],
            ]
        );
    }
}
