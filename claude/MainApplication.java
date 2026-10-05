package bo.umss.fcyt.tss.ui;

import bo.umss.fcyt.tss.db.DatabaseConnection;
import bo.umss.fcyt.tss.dao.TituladoDAO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;

/**
 * Aplicación principal del Sistema de Análisis de Mercado - Ingeniería en Sistemas
 * UMSS - Facultad de Ciencias y Tecnología
 */
public class MainApplication extends JFrame {
    private static final Logger logger = LoggerFactory.getLogger(MainApplication.class);
    
    private static final int WIDTH = 1000;
    private static final int HEIGHT = 700;
    
    private JTabbedPane tabbedPane;
    
    public MainApplication() {
        super("UMSS - TSS: Análisis de Mercado | Ingeniería en Sistemas");
        setupUI();
        setupDatabase();
    }
    
    /**
     * Configura la interfaz de usuario
     */
    private void setupUI() {
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(WIDTH, HEIGHT);
        setLocationRelativeTo(null);
        setDefaultLookAndFeelDecorated(true);
        
        // Barra de menú
        JMenuBar menuBar = crearMenuBar();
        setJMenuBar(menuBar);
        
        // Pestaña principal
        tabbedPane = new JTabbedPane();
        
        // Tab 1: Panel de inicio
        tabbedPane.addTab("📊 Inicio", crearPanelInicio());
        
        // Tab 2: Recolección de datos
        tabbedPane.addTab("📝 Encuestas", crearPanelEncuestas());
        
        // Tab 3: Análisis de datos
        tabbedPane.addTab("📈 Análisis", crearPanelAnalisis());
        
        // Tab 4: Visualización de datos
        tabbedPane.addTab("📉 Gráficos", crearPanelGraficos());
        
        // Tab 5: Reportes
        tabbedPane.addTab("📄 Reportes", crearPanelReportes());
        
        // Tab 6: Configuración
        tabbedPane.addTab("⚙️ Configuración", crearPanelConfiguracion());
        
        add(tabbedPane, BorderLayout.CENTER);
        
        // Barra de estado
        add(crearBarraEstado(), BorderLayout.SOUTH);
        
        setVisible(true);
    }
    
    /**
     * Crea la barra de menú
     */
    private JMenuBar crearMenuBar() {
        JMenuBar menuBar = new JMenuBar();
        
        // Menú Archivo
        JMenu menuArchivo = new JMenu("Archivo");
        menuArchivo.add(new JMenuItem(new AbstractAction("Nuevo Proyecto") {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(MainApplication.this, 
                    "Nuevo proyecto creado", "Información", JOptionPane.INFORMATION_MESSAGE);
            }
        }));
        menuArchivo.add(new JMenuItem(new AbstractAction("Abrir Proyecto") {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(MainApplication.this, 
                    "Función disponible próximamente", "Información", JOptionPane.INFORMATION_MESSAGE);
            }
        }));
        menuArchivo.addSeparator();
        menuArchivo.add(new JMenuItem(new AbstractAction("Salir") {
            @Override
            public void actionPerformed(ActionEvent e) {
                System.exit(0);
            }
        }));
        
        // Menú Herramientas
        JMenu menuHerramientas = new JMenu("Herramientas");
        menuHerramientas.add(new JMenuItem(new AbstractAction("Estadísticas Descriptivas") {
            @Override
            public void actionPerformed(ActionEvent e) {
                calcularEstadisticas();
            }
        }));
        menuHerramientas.add(new JMenuItem(new AbstractAction("Prueba Chi-Cuadrado") {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(MainApplication.this, 
                    "Prueba disponible en tab de Análisis", "Información", JOptionPane.INFORMATION_MESSAGE);
            }
        }));
        
        // Menú Ayuda
        JMenu menuAyuda = new JMenu("Ayuda");
        menuAyuda.add(new JMenuItem(new AbstractAction("Acerca de") {
            @Override
            public void actionPerformed(ActionEvent e) {
                mostrarAcercaDe();
            }
        }));
        menuAyuda.add(new JMenuItem(new AbstractAction("Manual de Usuario") {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(MainApplication.this, 
                    "Manual disponible en https://umss.edu.bo/tss", "Información", JOptionPane.INFORMATION_MESSAGE);
            }
        }));
        
        menuBar.add(menuArchivo);
        menuBar.add(menuHerramientas);
        menuBar.add(menuAyuda);
        
        return menuBar;
    }
    
    /**
     * Crea el panel de inicio
     */
    private JPanel crearPanelInicio() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JLabel titulo = new JLabel("SISTEMA DE ANÁLISIS DE MERCADO LABORAL");
        titulo.setFont(new Font("Arial", Font.BOLD, 20));
        
        JLabel subtitulo = new JLabel("Carrera de Ingeniería en Sistemas - UMSS");
        subtitulo.setFont(new Font("Arial", Font.PLAIN, 14));
        
        JTextArea descripcion = new JTextArea(
            "Bienvenido al Sistema de Análisis de Mercado para la Carrera de Ingeniería en Sistemas.\n\n" +
            "Este sistema permite:\n" +
            "✓ Recopilar información de titulados y empleadores\n" +
            "✓ Realizar análisis estadístico descriptivo e inferencial\n" +
            "✓ Visualizar datos mediante gráficos interactivos\n" +
            "✓ Generar reportes en Excel y PDF\n" +
            "✓ Evaluar la concordancia entre formación y requerimientos laborales\n\n" +
            "Versión 1.0 | 2026 | UMSS"
        );
        descripcion.setEditable(false);
        descripcion.setLineWrap(true);
        descripcion.setWrapStyleWord(true);
        descripcion.setBorder(BorderFactory.createEmptyBorder(20, 10, 20, 10));
        
        panel.add(titulo);
        panel.add(Box.createVerticalStrut(10));
        panel.add(subtitulo);
        panel.add(Box.createVerticalStrut(20));
        panel.add(new JScrollPane(descripcion));
        
        return panel;
    }
    
    /**
     * Crea el panel de encuestas
     */
    private JPanel crearPanelEncuestas() {
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(1, 2, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JButton btnEncuestaTitulados = new JButton("📋 Encuesta Titulados");
        btnEncuestaTitulados.setFont(new Font("Arial", Font.BOLD, 14));
        btnEncuestaTitulados.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Encuesta de Titulados\nEn desarrollo...", 
            "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        JButton btnEncuestaEmpleadores = new JButton("🏢 Encuesta Empleadores");
        btnEncuestaEmpleadores.setFont(new Font("Arial", Font.BOLD, 14));
        btnEncuestaEmpleadores.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Encuesta de Empleadores\nEn desarrollo...", 
            "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        panel.add(btnEncuestaTitulados);
        panel.add(btnEncuestaEmpleadores);
        
        return panel;
    }
    
    /**
     * Crea el panel de análisis
     */
    private JPanel crearPanelAnalisis() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JLabel titulo = new JLabel("HERRAMIENTAS DE ANÁLISIS");
        titulo.setFont(new Font("Arial", Font.BOLD, 16));
        
        JButton btnEstadisticas = new JButton("Estadísticas Descriptivas");
        btnEstadisticas.addActionListener(e -> calcularEstadisticas());
        
        JButton btnChiCuadrado = new JButton("Prueba Chi-Cuadrado (χ²)");
        btnChiCuadrado.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Prueba Chi² en desarrollo", "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        JButton btnCorrelacion = new JButton("Análisis de Correlación");
        btnCorrelacion.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Análisis de correlación en desarrollo", "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        panel.add(titulo);
        panel.add(Box.createVerticalStrut(20));
        panel.add(btnEstadisticas);
        panel.add(Box.createVerticalStrut(10));
        panel.add(btnChiCuadrado);
        panel.add(Box.createVerticalStrut(10));
        panel.add(btnCorrelacion);
        panel.add(Box.createVerticalGlue());
        
        return panel;
    }
    
    /**
     * Crea el panel de gráficos
     */
    private JPanel crearPanelGraficos() {
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(2, 2, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JButton btn1 = new JButton("Gráfico de Barras");
        JButton btn2 = new JButton("Gráfico de Pastel");
        JButton btn3 = new JButton("Matriz de Calor");
        JButton btn4 = new JButton("Diagrama de Radar");
        
        panel.add(btn1);
        panel.add(btn2);
        panel.add(btn3);
        panel.add(btn4);
        
        return panel;
    }
    
    /**
     * Crea el panel de reportes
     */
    private JPanel crearPanelReportes() {
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(2, 1, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JButton btnExportarExcel = new JButton("Exportar a Excel");
        btnExportarExcel.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Exportación en desarrollo", "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        JButton btnGenerarPDF = new JButton("Generar Reporte PDF");
        btnGenerarPDF.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Generación de PDF en desarrollo", "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        panel.add(btnExportarExcel);
        panel.add(btnGenerarPDF);
        
        return panel;
    }
    
    /**
     * Crea el panel de configuración
     */
    private JPanel crearPanelConfiguracion() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        JLabel titulo = new JLabel("CONFIGURACIÓN DEL SISTEMA");
        titulo.setFont(new Font("Arial", Font.BOLD, 16));
        
        JButton btnTestBD = new JButton("🔍 Probar Conexión a Base de Datos");
        btnTestBD.addActionListener(e -> {
            DatabaseConnection.testConnection();
            JOptionPane.showMessageDialog(panel, "Prueba completada. Revise la consola.", "Información", JOptionPane.INFORMATION_MESSAGE);
        });
        
        JButton btnReiniciarBD = new JButton("🔄 Reiniciar Base de Datos");
        btnReiniciarBD.addActionListener(e -> {
            int confirm = JOptionPane.showConfirmDialog(panel, 
                "¿Desea reiniciar la base de datos?\nEsto eliminará todos los datos.", 
                "Confirmación", JOptionPane.YES_NO_OPTION);
            if (confirm == JOptionPane.YES_OPTION) {
                JOptionPane.showMessageDialog(panel, "Base de datos reiniciada", "Información", JOptionPane.INFORMATION_MESSAGE);
            }
        });
        
        JButton btnIdioma = new JButton("🌐 Seleccionar Idioma");
        btnIdioma.addActionListener(e -> 
            JOptionPane.showMessageDialog(panel, "Idioma: Español (predeterminado)", "Información", JOptionPane.INFORMATION_MESSAGE)
        );
        
        panel.add(titulo);
        panel.add(Box.createVerticalStrut(20));
        panel.add(btnTestBD);
        panel.add(Box.createVerticalStrut(10));
        panel.add(btnReiniciarBD);
        panel.add(Box.createVerticalStrut(10));
        panel.add(btnIdioma);
        panel.add(Box.createVerticalGlue());
        
        return panel;
    }
    
    /**
     * Crea la barra de estado
     */
    private JPanel crearBarraEstado() {
        JPanel panel = new JPanel();
        panel.setBorder(BorderFactory.createEtchedBorder());
        
        TituladoDAO dao = new TituladoDAO();
        Integer countTitulados = dao.contar();
        
        JLabel label = new JLabel("Sistema listo | Titulados en BD: " + countTitulados + " | v1.0");
        panel.add(label);
        
        return panel;
    }
    
    /**
     * Calcula estadísticas
     */
    private void calcularEstadisticas() {
        TituladoDAO dao = new TituladoDAO();
        Integer total = dao.contar();
        
        String mensaje = "ESTADÍSTICAS ACTUALES\n" +
                        "═══════════════════════════\n" +
                        "Total de Titulados: " + total + "\n" +
                        "Titulados con Posgrado: (pendiente)\n" +
                        "Tasa de Empleabilidad: (pendiente)\n" +
                        "\nMás detalles en la sección de Análisis";
        
        JOptionPane.showMessageDialog(this, mensaje, "Estadísticas", JOptionPane.INFORMATION_MESSAGE);
    }
    
    /**
     * Muestra diálogo "Acerca de"
     */
    private void mostrarAcercaDe() {
        String about = "SISTEMA DE ANÁLISIS DE MERCADO\n" +
                       "═══════════════════════════════════\n\n" +
                       "Universidad Mayor de San Simón\n" +
                       "Facultad de Ciencias y Tecnología\n" +
                       "Carrera de Ingeniería en Sistemas\n\n" +
                       "Versión: 1.0\n" +
                       "Año: 2026\n" +
                       "Enfoque: ARCUSUR\n\n" +
                       "Desarrollado para el Análisis de Mercado Laboral\n" +
                       "y Perfil de Empleabilidad de Titulados.";
        
        JOptionPane.showMessageDialog(this, about, "Acerca de", JOptionPane.INFORMATION_MESSAGE);
    }
    
    /**
     * Método principal
     */
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception e) {
                logger.error("Error al configurar Look and Feel", e);
            }
            
            new MainApplication();
        });
    }
}
