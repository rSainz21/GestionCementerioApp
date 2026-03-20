// ═══════════════════════════════════════════════════════════════════════════
// NUEVO FICHERO: src/main/java/com/example/cementerio_api/controladores/PagoController.java
//
// DEPENDENCIA en build.gradle:
//   implementation 'com.stripe:stripe-java:24.22.0'
//
// CONFIGURAR en application.properties:
//   stripe.secret.key=sk_test_TU_CLAVE_SECRETA_AQUI
//   stripe.publishable.key=pk_test_TU_CLAVE_PUBLICA_AQUI
//
// Obtén tus claves gratis en: https://dashboard.stripe.com/test/apikeys
// ═══════════════════════════════════════════════════════════════════════════

package com.example.cementerio_api.controladores;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;

    /**
     * Crea un PaymentIntent de Stripe para cobrar una tasa municipal.
     * La app Android recibe el client_secret y lo usa en PaymentSheet.
     */
    @PostMapping("/crear-intento")
    public ResponseEntity<Map<String, Object>> crearIntento(
            @RequestBody Map<String, Object> body) {
        try {
            Stripe.apiKey = stripeSecretKey;

            long importe  = Long.parseLong(body.get("importe").toString());   // en céntimos
            String concepto = body.getOrDefault("concepto", "Tasa municipal").toString();
            String email    = body.getOrDefault("email", "").toString();

            PaymentIntentCreateParams.Builder params = PaymentIntentCreateParams.builder()
                    .setAmount(importe)
                    .setCurrency("eur")
                    .setDescription(concepto)
                    .setReceiptEmail(email.isBlank() ? null : email)
                    .addPaymentMethodType("card");

            PaymentIntent intent = PaymentIntent.create(params.build());

            Map<String, Object> response = new HashMap<>();
            response.put("clientSecret",    intent.getClientSecret());
            response.put("publishableKey",  stripePublishableKey);
            response.put("amount",          importe);
            response.put("currency",        "eur");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "No se pudo crear el intento de pago: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
